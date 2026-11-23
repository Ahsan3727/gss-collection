import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReview extends Document {
  productId: string;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  createdAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    approved: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
