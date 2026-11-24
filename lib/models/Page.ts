import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPage extends Document {
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metaDesc: { type: String },
  },
  { timestamps: true }
);

export const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
