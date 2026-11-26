import mongoose, { Schema, Model } from 'mongoose';

export interface IRateLimit {
  _id: string;
  count: number;
  expiresAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  _id: { type: String, required: true },
  count: { type: Number, required: true, default: 1 },
  expiresAt: { type: Date, required: true },
});

RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);
