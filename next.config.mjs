const mongoUri = process.env.MONGODB_URI;
const authSecret = process.env.NEXTAUTH_SECRET || '';

if (process.env.NODE_ENV === 'production') {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }
  if (authSecret.length < 16) {
    throw new Error('NEXTAUTH_SECRET must be at least 16 characters');
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
