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
  spotlightId?: string;
  moderateReviews: boolean;
}

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
    spotlightId: { type: String, default: 'p01' },
    moderateReviews: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
