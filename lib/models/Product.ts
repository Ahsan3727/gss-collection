import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProductVariant {
  sku: string;
  stone: string;
  size: string;
  price: number;
  compareAt?: number;
  stock: number;
}

export interface IProductPhoto {
  url: string;
  publicId?: string;
  alt?: string;
}

export interface IProduct extends Document {
  id: string;
  handle: string;
  title: string;
  setting: string;
  family: string;
  band: string;
  cat: string;
  kind: 'ring' | 'bracelet' | 'stone';
  aud: 'women' | 'men' | 'unisex';
  stones: string[];
  base: number;
  stoneDeltas: Map<string, number>;
  compareAt?: number;
  sizes: string[];
  variants: IProductVariant[];
  inventory: Map<string, number>;
  tags: string[];
  photos: string[];
  structuredPhotos?: IProductPhoto[];
  desc: string;
  weight?: number;
  width?: number;
  status: 'active' | 'draft' | 'archived';
  sold: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true },
    stone: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    compareAt: { type: Number },
    stock: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    id: { type: String, required: true, unique: true },
    handle: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    setting: { type: String, required: true },
    family: { type: String, required: true },
    band: { type: String, required: true },
    cat: { type: String, required: true, lowercase: true, trim: true, index: true },
    kind: { type: String, enum: ['ring', 'bracelet', 'stone'], default: 'ring' },
    aud: { type: String, enum: ['women', 'men', 'unisex'], required: true },
    stones: [{ type: String }],
    base: { type: Number, required: true },
    stoneDeltas: { type: Map, of: Number, default: {} },
    compareAt: { type: Number },
    sizes: [{ type: String }],
    variants: [VariantSchema],
    inventory: { type: Map, of: Number, default: {} },
    tags: [{ type: String }],
    photos: [{ type: String }],
    structuredPhotos: [
      {
        url: { type: String },
        publicId: { type: String },
        alt: { type: String },
      },
    ],
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
ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ status: 1, cat: 1, kind: 1, sold: -1, createdAt: -1 });
ProductSchema.index({ 'variants.sku': 1 });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
