import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://localhost:27017/gss-collection'),
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters').default('gss_collection_secret_key_super_secure_2026_dev'),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_PASSWORD: z.string().min(6).default('admin123'),
  ADMIN_EMAIL: z.string().email().default('admin@gsscollection.com'),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional().default('demo'),
});

export const env = envSchema.parse({
  MONGODB_URI: process.env.MONGODB_URI,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
});
