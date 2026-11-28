import { z } from 'zod';
import { validateCheckoutPhone } from '@/lib/contact';
import { DISCOUNT_TYPES, FULFIL_STATUSES, PAY_METHODS, PAY_STATUSES } from '@/lib/types';

export const OrderItemInputSchema = z.object({
  productId: z.string().min(1),
  handle: z.string().optional(),
  title: z.string().optional(),
  stone: z.string().min(1),
  size: z.string().min(1),
  qty: z.number().int().min(1).max(10),
});

export const CreateOrderInputSchema = z
  .object({
    items: z
      .array(OrderItemInputSchema)
      .min(1, 'Order must contain at least one item')
      .max(50, 'Order cannot contain more than 50 line items'),
    contact: z.object({
      email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
      phone: z.string().min(8, 'Please enter a valid phone number'),
    }),
    address: z.object({
      name: z.string().min(2, 'Full name is required'),
      line1: z.string().min(3, 'Street address is required'),
      line2: z.string().optional(),
      city: z.string().min(2, 'City is required'),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().default('PK'),
    }),
    payMethod: z.enum(PAY_METHODS),
    shippingMethodId: z.string().optional(),
    discountCode: z.string().optional(),
    note: z.string().max(500).optional(),
    idempotencyKey: z.string().min(4).max(128).optional(),
  })
  .superRefine((val, ctx) => {
    const phoneErr = validateCheckoutPhone(val.contact.phone, val.address.country);
    if (phoneErr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneErr,
        path: ['contact', 'phone'],
      });
    }

    const qtyByVariant = new Map<string, number>();
    for (const item of val.items) {
      const key = `${item.productId}::${item.stone}::${item.size}`;
      const nextQty = (qtyByVariant.get(key) || 0) + item.qty;
      if (nextQty > 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Maximum quantity of 10 per item variant exceeded',
          path: ['items'],
        });
        break;
      }
      qtyByVariant.set(key, nextQty);
    }
  });

export const CartValidateInputSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().optional(),
        handle: z.string().optional(),
        title: z.string().optional(),
        stone: z.string().optional(),
        size: z.string().optional(),
        qty: z.number().optional(),
      })
    )
    .max(50, 'Too many items in cart'),
  country: z.string().optional(),
  shippingMethodId: z.string().optional(),
});

export const DiscountValidateInputSchema = z.object({
  code: z.string().min(1, 'Please enter a discount code'),
  subtotal: z.number().nonnegative().default(0),
  country: z.string().optional(),
  shippingMethodId: z.string().optional(),
});

export const AdminDiscountCreateSchema = z
  .object({
    code: z.string().min(2).max(32),
    type: z.enum(DISCOUNT_TYPES),
    value: z.number().nonnegative(),
    minOrder: z.number().nonnegative().default(0),
    limit: z.number().int().nonnegative().default(0),
  })
  .refine((val) => val.type === 'ship' || val.value > 0, {
    message: 'Discount value must be greater than zero',
    path: ['value'],
  });

export const AdminOrderPatchSchema = z.object({
  fulfil: z.enum(FULFIL_STATUSES).optional(),
  payStatus: z.enum(PAY_STATUSES).optional(),
  trackingCarrier: z.string().max(80).optional(),
  trackingNumber: z.string().max(100).optional(),
  adminNote: z.string().max(500).optional(),
});

export const AdminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be 128 characters or fewer'),
});
