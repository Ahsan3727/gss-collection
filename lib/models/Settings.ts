import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  storeName: string;
  tagline: string;
  baseCurrency: string;
  freeShippingFrom: number;
  shipping: {
    pk: { id: string; label: string; eta: string; price: number }[];
    intl: { id: string; label: string; eta: string; price: number }[];
  };
  announcements: string[];
  contact: {
    email: string;
    phone: string;
    hours: string;
    address: string;
  };
  bank: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
  };
  hero?: {
    eyebrow: string;
    headline: string;
    description: string;
    imageUrl: string;
    imageAlt?: string;
    linkHref?: string;
  };
  ringSizes?: {
    ladies: { size: string; diameterMm: number; circumferenceMm: number; note?: string }[];
    gents: { size: string; diameterMm: number; circumferenceMm: number; note?: string }[];
    fitTip: string;
  };
  spotlightId?: string;
  moderateReviews: boolean;
}

const RingSizeRowSchema = new Schema(
  {
    size: { type: String, required: true, trim: true },
    diameterMm: { type: Number, required: true },
    circumferenceMm: { type: Number, required: true },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const SettingsSchema = new Schema<ISettings>(
  {
    storeName: { type: String, default: 'GSS Collection' },
    tagline: { type: String, default: 'Silver rings, set with stone' },
    baseCurrency: { type: String, default: 'PKR' },
    freeShippingFrom: { type: Number, default: 15000 },
    shipping: {
      pk: {
        type: [
          {
            id: String,
            label: String,
            eta: String,
            price: Number,
          },
        ],
        default: [
          { id: 'std', label: 'Standard delivery', eta: '3 to 5 business days', price: 300 },
          { id: 'exp', label: 'Express delivery', eta: '1 to 2 business days', price: 700 },
        ],
      },
      intl: {
        type: [
          {
            id: String,
            label: String,
            eta: String,
            price: Number,
          },
        ],
        default: [
          { id: 'std', label: 'International standard', eta: '7 to 14 business days', price: 3500 },
          { id: 'exp', label: 'International express', eta: '3 to 5 business days', price: 6500 },
        ],
      },
    },
    announcements: {
      type: [String],
      default: [
        'Use code WELCOME10 for 10% off your first order',
        'Free standard delivery in Pakistan on orders over Rs. 15,000',
        'Cash on delivery available across Pakistan',
      ],
    },
    contact: {
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      hours: { type: String, default: 'Mon to Sat, 10:00 to 18:00 (PKT)' },
      address: { type: String, default: '' },
    },
    bank: {
      bankName: { type: String, default: 'Meezan Bank' },
      accountTitle: { type: String, default: 'GSS Collection' },
      accountNumber: { type: String, default: '' },
    },
    hero: {
      eyebrow: { type: String, default: 'Handcrafted in 925 Sterling Silver' },
      headline: { type: String, default: 'Natural untreated gemstones, set for a lifetime.' },
      description: {
        type: String,
        default:
          'Individually crafted with hallmarked silver and earth-mined stones. From bold signets to delicate solitaires.',
      },
      imageUrl: { type: String, default: '' },
      imageAlt: { type: String, default: '' },
      linkHref: { type: String, default: '/collections/all' },
    },
    ringSizes: {
      ladies: {
        type: [RingSizeRowSchema],
        default: [
          { size: '5', diameterMm: 15.7, circumferenceMm: 49.3, note: '' },
          { size: '6', diameterMm: 16.5, circumferenceMm: 51.8, note: '' },
          { size: '7', diameterMm: 17.3, circumferenceMm: 54.4, note: '' },
          { size: '8', diameterMm: 18.1, circumferenceMm: 56.9, note: '' },
          { size: '9', diameterMm: 18.9, circumferenceMm: 59.5, note: '' },
        ],
      },
      gents: {
        type: [RingSizeRowSchema],
        default: [
          { size: '7', diameterMm: 17.3, circumferenceMm: 54.4, note: '' },
          { size: '8', diameterMm: 18.1, circumferenceMm: 56.9, note: '' },
          { size: '9', diameterMm: 18.9, circumferenceMm: 59.5, note: '' },
          { size: '10', diameterMm: 19.8, circumferenceMm: 62.1, note: '' },
          { size: '11', diameterMm: 20.6, circumferenceMm: 64.6, note: '' },
          { size: '12', diameterMm: 21.4, circumferenceMm: 67.2, note: '' },
        ],
      },
      fitTip: {
        type: String,
        default: 'If you fall between sizes, we recommend selecting the larger size for wider bands.',
      },
    },
    spotlightId: { type: String, default: 'p01' },
    moderateReviews: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
