import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CategoryTargetType } from '@/lib/types';

export interface ICategory extends Document {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  targetType: CategoryTargetType;
  pageSlug: string;
  defaultKind: 'ring' | 'bracelet' | 'stone';
  homeKindFilter: 'all' | 'ring' | 'bracelet' | 'stone';
  sortOrder: number;
  showInNav: boolean;
  showOnHome: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    targetType: { type: String, enum: ['collection', 'page'], default: 'collection' },
    pageSlug: { type: String, default: '', lowercase: true, trim: true },
    defaultKind: { type: String, enum: ['ring', 'bracelet', 'stone'], default: 'ring' },
    homeKindFilter: { type: String, enum: ['all', 'ring', 'bracelet', 'stone'], default: 'all' },
    sortOrder: { type: Number, default: 0 },
    showInNav: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CategorySchema.index({ active: 1, sortOrder: 1, createdAt: 1 });

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
