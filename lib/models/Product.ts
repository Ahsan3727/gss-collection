import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  id: string;
  handle: string;
  title: string;
  setting: string;
  family: string;
  band: string;
  cat: 'ladies' | 'gents' | 'gems';
  aud: 'women' | 'men' | 'unisex';
  stones: string[];
  base: number;
  stoneDeltas: Map<string, number>;
  compareAt?: number;
  sizes: string[];
  inventory: Map<string, number>;
  tags: string[];
  photos: string[];
  desc: string;
  weight?: number;
  width?: number;
  status: 'active' | 'draft' | 'archived';
  sold: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    handle: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    setting: { type: String, required: true },
    family: { type: String, required: true },
    band: { type: String, required: true },
    cat: { type: String, enum: ['ladies', 'gents', 'gems'], required: true },
    aud: { type: String, enum: ['women', 'men', 'unisex'], required: true },
    stones: [{ type: String }],
    base: { type: Number, required: true },
    stoneDeltas: { type: Map, of: Number, default: {} },
    compareAt: { type: Number },
    sizes: [{ type: String }],
    inventory: { type: Map, of: Number, default: {} },
    tags: [{ type: String }],
    photos: [{ type: String }],
    desc: { type: String, default: '' },
    weight: { type: Number },
    width: { type: Number },
    status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active', index: true },
    sold: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ title: 'text', desc: 'text', tags: 'text' });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
