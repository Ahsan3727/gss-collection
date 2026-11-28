import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPageImage {
  url: string;
  caption?: string;
}

export interface IPage extends Document {
  slug: string;
  title: string;
  body: string;
  metaDesc?: string;
  images: IPageImage[];
  updatedAt: Date;
}

const PageImageSchema = new Schema<IPageImage>(
  {
    url: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const PageSchema = new Schema<IPage>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metaDesc: { type: String },
    images: { type: [PageImageSchema], default: [] },
  },
  { timestamps: true }
);

export const Page: Model<IPage> =
  mongoose.models.Page || mongoose.model<IPage>('Page', PageSchema);
