import mongoose from 'mongoose';
import { STONES } from '@/lib/constants';

const CATS = ['ladies', 'gents', 'gems'] as const;
const KINDS = ['ring', 'bracelet', 'stone'] as const;
const STATUSES = ['active', 'draft', 'archived'] as const;

export type ProductCategory = (typeof CATS)[number];
export type ProductKind = (typeof KINDS)[number];
export type ProductStatus = (typeof STATUSES)[number];

export interface ProductWriteInput {
  title: string;
  handle: string;
  cat: ProductCategory;
  kind: ProductKind;
  desc: string;
  base: number;
  compareAt?: number;
  stones: string[];
  sizes: string[];
  photos: string[];
  status: ProductStatus;
  stock: Record<string, number>;
  setting?: string;
  aud?: 'women' | 'men' | 'unisex';
}

export interface BuiltProduct {
  id: string;
  handle: string;
  title: string;
  setting: string;
  family: string;
  band: string;
  cat: ProductCategory;
  kind: ProductKind;
  aud: 'women' | 'men' | 'unisex';
  stones: string[];
  base: number;
  stoneDeltas: Record<string, number>;
  compareAt?: number;
  sizes: string[];
  variants: {
    sku: string;
    stone: string;
    size: string;
    price: number;
    compareAt?: number;
    stock: number;
  }[];
  inventory: Record<string, number>;
  tags: string[];
  photos: string[];
  desc: string;
  status: ProductStatus;
}

export function slugifyHandle(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function parseProductWrite(body: unknown): { data: ProductWriteInput } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Product details are required.' };
  }

  const input = body as Record<string, unknown>;
  const title = String(input.title || '').trim();
  const handle = slugifyHandle(String(input.handle || title));
  const cat = String(input.cat || '');
  const kind = String(input.kind || '');
  const desc = String(input.desc ?? input.description ?? '').trim();
  const base = Number(input.base);
  const status = String(input.status || '');
  const stones = unique(asStringArray(input.stones));
  const sizes = unique(asStringArray(input.sizes).map((size) => size.replace(/\s+/g, '')));
  const photos = unique(
    (Array.isArray(input.photos) ? input.photos : [])
      .map((photo) => String(photo).trim())
      .filter((photo) => photo.startsWith('/') || photo.startsWith('https://') || photo.startsWith('http://'))
  );

  if (!title) return { error: 'Title is required.' };
  if (!handle) return { error: 'Handle is required.' };
  if (!CATS.includes(cat as ProductCategory)) return { error: 'Category must be ladies, gents, or gems.' };
  if (!KINDS.includes(kind as ProductKind)) return { error: 'Kind must be ring, bracelet, or stone.' };
  if (!desc) return { error: 'Description is required.' };
  if (!Number.isFinite(base) || base <= 0) return { error: 'Base price must be greater than zero.' };
  if (!stones.length) return { error: 'Select at least one stone.' };
  if (stones.some((stone) => !/^[a-z0-9]+$/.test(stone))) {
    return { error: 'Stone names must use lowercase letters and numbers only.' };
  }
  if (!sizes.length) return { error: 'Select at least one size.' };
  if (!photos.length) return { error: 'Upload at least one photo.' };
  if (!STATUSES.includes(status as ProductStatus)) {
    return { error: 'Status must be active, draft, or archived.' };
  }

  let compareAt: number | undefined;
  if (input.compareAt !== undefined && input.compareAt !== null && String(input.compareAt).trim() !== '') {
    compareAt = Number(input.compareAt);
    if (!Number.isFinite(compareAt) || compareAt <= 0) {
      return { error: 'Compare-at price must be greater than zero.' };
    }
  }

  const rawStock = input.stock && typeof input.stock === 'object' ? (input.stock as Record<string, unknown>) : {};
  const stock: Record<string, number> = {};
  for (const stone of stones) {
    for (const size of sizes) {
      const key = `${stone}:${size}`;
      const value = Number(rawStock[key] ?? 0);
      if (!Number.isFinite(value) || value < 0) {
        return { error: `Stock for ${stone} / ${size} must be zero or greater.` };
      }
      stock[key] = Math.floor(value);
    }
  }

  const aud = input.aud === 'women' || input.aud === 'men' || input.aud === 'unisex' ? input.aud : undefined;
  const setting = typeof input.setting === 'string' && input.setting.trim() ? input.setting.trim() : undefined;

  return {
    data: {
      title,
      handle,
      cat: cat as ProductCategory,
      kind: kind as ProductKind,
      desc,
      base,
      compareAt,
      stones,
      sizes,
      photos,
      status: status as ProductStatus,
      stock,
      setting,
      aud,
    },
  };
}

export function buildProductDocument(
  input: ProductWriteInput,
  options?: { id?: string; existingDeltas?: Record<string, number> }
): BuiltProduct {
  const setting = input.setting || 'solitaire';
  const aud =
    input.aud || (input.cat === 'gents' ? 'men' : input.cat === 'gems' ? 'unisex' : 'women');
  const existingDeltas = options?.existingDeltas || {};
  const stoneDeltas: Record<string, number> = {};
  const variants: BuiltProduct['variants'] = [];
  const inventory: Record<string, number> = {};

  for (const stone of input.stones) {
    const delta = existingDeltas[stone] ?? STONES[stone]?.delta ?? 0;
    stoneDeltas[stone] = delta;
    const price = input.base + delta;

    for (const size of input.sizes) {
      const key = `${stone}:${size}`;
      const stock = input.stock[key] ?? 0;
      variants.push({
        sku: `${input.handle.toUpperCase()}-${stone.toUpperCase()}-${size}`,
        stone,
        size,
        price,
        compareAt: input.compareAt,
        stock,
      });
      inventory[key] = stock;
    }
  }

  return {
    id: options?.id || input.handle,
    handle: input.handle,
    title: input.title,
    setting,
    family: setting === 'signet' || setting === 'stepcut' ? 'statement' : 'single',
    band: 'slim',
    cat: input.cat,
    kind: input.kind,
    aud,
    stones: input.stones,
    base: input.base,
    stoneDeltas,
    compareAt: input.compareAt,
    sizes: input.sizes,
    variants,
    inventory,
    tags: [input.cat, setting, input.kind, ...input.stones],
    photos: input.photos,
    desc: input.desc,
    status: input.status,
  };
}

export function productLookup(id: string) {
  const clauses: Record<string, string>[] = [{ id }, { handle: id }];
  if (mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id) {
    clauses.push({ _id: id });
  }
  return { $or: clauses };
}

export function readDeltaMap(value: unknown): Record<string, number> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([key, amount]) => [String(key), Number(amount) || 0]));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, amount]) => [key, Number(amount) || 0])
    );
  }
  return {};
}
