import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDiscount extends Document {
  code: string;
  type: 'pct' | 'fixed' | 'ship';
  value: number;
  minOrder: number;
  active: boolean;
  uses: number;
  limit: number;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['pct', 'fixed', 'ship'], required: true },
    value: { type: Number, required: true },
    minOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    uses: { type: Number, default: 0 },
    limit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Discount: Model<IDiscount> =
  mongoose.models.Discount || mongoose.model<IDiscount>('Discount', DiscountSchema);
