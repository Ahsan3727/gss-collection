import { z } from 'zod';

export const PRODUCT_CATEGORIES = ['ladies', 'gents', 'gems'] as const;
export const PRODUCT_KINDS = ['ring', 'bracelet', 'stone'] as const;
export const PRODUCT_STATUSES = ['active', 'draft', 'archived'] as const;
export const PAY_METHODS = ['cod', 'bank'] as const;
export const PAY_STATUSES = ['pending', 'paid', 'refunded'] as const;
export const FULFIL_STATUSES = [
  'unfulfilled',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export const DISCOUNT_TYPES = ['pct', 'fixed', 'ship'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductKind = (typeof PRODUCT_KINDS)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export type PayMethod = (typeof PAY_METHODS)[number];
export type PayStatus = (typeof PAY_STATUSES)[number];
export type FulfilStatus = (typeof FULFIL_STATUSES)[number];
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const ProductVariantSchema = z.object({
  sku: z.string(),
  stone: z.string(),
  size: z.string(),
  price: z.number().nonnegative(),
  compareAt: z.number().positive().optional(),
  stock: z.number().int().nonnegative(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductRecordSchema = z.object({
  _id: z.string().optional(),
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  setting: z.string(),
  family: z.string().optional(),
  band: z.string().optional(),
  cat: z.enum(PRODUCT_CATEGORIES),
  kind: z.enum(PRODUCT_KINDS).optional(),
  aud: z.enum(['women', 'men', 'unisex']).optional(),
  stones: z.array(z.string()),
  base: z.number(),
  stoneDeltas: z.record(z.number()).optional(),
  compareAt: z.number().optional(),
  sizes: z.array(z.string()),
  variants: z.array(ProductVariantSchema).optional(),
  inventory: z.record(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  photos: z.array(z.string()).optional(),
  desc: z.string().optional(),
  weight: z.number().optional(),
  width: z.number().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  sold: z.number().optional(),
  createdAt: z.string().optional(),
});

export type ProductRecord = z.infer<typeof ProductRecordSchema>;

export const CartItemSchema = z.object({
  productId: z.string().min(1),
  handle: z.string().min(1),
  title: z.string().min(1),
  stone: z.string().min(1),
  size: z.string().min(1),
  price: z.number().nonnegative(),
  photo: z.string().optional(),
  qty: z.number().int().min(1).max(10),
  maxStock: z.number().int().nonnegative().optional(),
  sku: z.string().optional(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const OrderItemSchema = z.object({
  productId: z.string(),
  sku: z.string().optional(),
  handle: z.string(),
  title: z.string(),
  stone: z.string(),
  size: z.string(),
  qty: z.number().int().min(1),
  price: z.number().nonnegative(),
  photo: z.string().optional(),
});

export type OrderItemRecord = z.infer<typeof OrderItemSchema>;

export const OrderRecordSchema = z.object({
  _id: z.string().optional(),
  orderNo: z.string(),
  items: z.array(OrderItemSchema),
  subtotal: z.number(),
  discount: z.number(),
  discountCode: z.string().optional(),
  shipping: z.number(),
  shippingLabel: z.string(),
  total: z.number(),
  payMethod: z.enum(PAY_METHODS),
  payStatus: z.enum(PAY_STATUSES),
  fulfil: z.enum(FULFIL_STATUSES),
  tracking: z
    .object({
      carrier: z.string().optional(),
      number: z.string().optional(),
    })
    .optional(),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
  }),
  address: z.object({
    name: z.string(),
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string(),
  }),
  note: z.string().optional(),
  timeline: z.array(z.object({ at: z.string(), text: z.string() })).optional(),
  adminNotes: z.array(z.object({ at: z.string(), text: z.string() })).optional(),
  restocked: z.boolean().optional(),
  createdAt: z.string(),
});

export type OrderRecord = z.infer<typeof OrderRecordSchema>;

export const ShippingMethodSchema = z.object({
  id: z.string(),
  label: z.string(),
  eta: z.string(),
  price: z.number().nonnegative(),
});

export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

export const StoreSettingsSchema = z.object({
  storeName: z.string(),
  tagline: z.string(),
  baseCurrency: z.string(),
  freeShippingFrom: z.number().nonnegative(),
  shipping: z.object({
    pk: z.array(ShippingMethodSchema),
    intl: z.array(ShippingMethodSchema),
  }),
  announcements: z.array(z.string()),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
    hours: z.string(),
    address: z.string(),
  }),
  bank: z.object({
    bankName: z.string(),
    accountTitle: z.string(),
    accountNumber: z.string(),
  }),
  spotlightId: z.string().optional(),
  moderateReviews: z.boolean(),
});

export type StoreSettingsData = z.infer<typeof StoreSettingsSchema>;

export const DiscountRecordSchema = z.object({
  _id: z.string(),
  code: z.string(),
  type: z.enum(DISCOUNT_TYPES),
  value: z.number(),
  minOrder: z.number(),
  active: z.boolean(),
  uses: z.number(),
  limit: z.number(),
  createdAt: z.string().optional(),
});

export type DiscountRecord = z.infer<typeof DiscountRecordSchema>;

export const MessageRecordSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

export type MessageRecord = z.infer<typeof MessageRecordSchema>;

export interface CustomerSummaryRecord {
  _id: string;
  name: string;
  phone: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string;
}

export interface ReviewRecord {
  _id: string;
  productId: string;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: string;
}

export interface PageRecord {
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
  updatedAt?: string;
}
