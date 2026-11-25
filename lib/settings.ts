import { connectDB } from '@/lib/db';
import { Settings, ISettings } from '@/lib/models/Settings';

export const DEFAULT_SETTINGS = {
  storeName: 'GSS Collection',
  tagline: 'Handcrafted in 925 Sterling Silver & Natural Gemstones',
  baseCurrency: 'PKR',
  freeShippingFrom: 15000,
  shipping: {
    pk: [
      { id: 'std', label: 'Standard delivery (Pakistan)', eta: '3 to 5 business days', price: 300 },
      { id: 'exp', label: 'Express courier delivery', eta: '1 to 2 business days', price: 700 },
    ],
    intl: [
      { id: 'std', label: 'International registered mail', eta: '10 to 18 business days', price: 3500 },
      { id: 'exp', label: 'DHL / FedEx Express', eta: '3 to 5 business days', price: 6500 },
    ],
  },
  announcements: [
    'Handcrafted in 925 Sterling Silver with Natural Mined Gemstones',
    'Free nationwide delivery across Pakistan on orders over Rs. 15,000',
    'Cash on delivery & direct bank transfer accepted',
  ],
  contact: {
    email: 'info@gsscollection.com',
    phone: '+92 300 1234567',
    hours: 'Mon - Sat, 10:00 AM - 7:00 PM PKT',
    address: 'GSS Collection Fine Jewellery, Lahore, Pakistan',
  },
  bank: {
    bankName: 'Meezan Bank Ltd',
    accountTitle: 'GSS Collection',
    // Left blank on purpose: the real account number is saved in /admin/settings.
    // A made-up number here could send customer payments to the wrong account
    // if the settings read ever fails.
    accountNumber: '',
  },
  spotlightId: 'crimson-halo-ring',
  moderateReviews: false,
};

export async function getStoreSettings(): Promise<typeof DEFAULT_SETTINGS> {
  try {
    await connectDB();
    const doc = await Settings.findOne().lean();
    if (doc) {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(JSON.stringify(doc)),
      };
    }
  } catch (err) {
    console.warn('[Settings] Failed to fetch settings from DB, using defaults');
  }
  return DEFAULT_SETTINGS;
}
