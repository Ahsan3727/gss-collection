import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  productId: string;
  sku?: string;
  handle: string;
  title: string;
  stone: string;
  size: string;
  qty: number;
  price: number;
  photo?: string;
}

export interface IOrder extends Document {
  orderNo: string;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  discountCode?: string;
  shipping: number;
  shippingLabel: string;
  total: number;
  payMethod: 'cod' | 'bank';
  payStatus: 'pending' | 'paid' | 'refunded';
  fulfil: 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  tracking?: { carrier: string; number: string };
  contact: { email: string; phone: string };
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    zip?: string;
    country: string;
  };
  note?: string;
  idempotencyKey?: string;
  accessToken?: string;
  timeline: { at: Date; text: string }[];
  adminNotes: { at: Date; text: string }[];
  restocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    items: [
      {
        productId: { type: String, required: true },
        sku: { type: String },
        handle: { type: String, required: true },
        title: { type: String, required: true },
        stone: { type: String, required: true },
        size: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        photo: { type: String },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountCode: { type: String },
    shipping: { type: Number, default: 0 },
    shippingLabel: { type: String, default: 'Standard delivery' },
    total: { type: Number, required: true },
    payMethod: { type: String, enum: ['cod', 'bank'], default: 'cod' },
    payStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    fulfil: {
      type: String,
      enum: ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'unfulfilled',
      index: true,
    },
    tracking: {
      carrier: { type: String },
      number: { type: String },
    },
    contact: {
      email: { type: String, required: true, index: true },
      phone: { type: String, required: true, index: true },
    },
    address: {
      name: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String },
      zip: { type: String },
      country: { type: String, required: true, default: 'PK' },
    },
    note: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
    accessToken: { type: String, index: true },
    timeline: [
      {
        at: { type: Date, default: Date.now },
        text: { type: String, required: true },
      },
    ],
    adminNotes: [
      {
        at: { type: Date, default: Date.now },
        text: { type: String, required: true },
      },
    ],
    restocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ fulfil: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export function orderLookup(id: string): Record<string, unknown> {
  const orderNo = id.trim().toUpperCase();
  if (mongoose.isValidObjectId(id)) {
    return { $or: [{ orderNo }, { _id: id }] };
  }
  return { orderNo };
}
