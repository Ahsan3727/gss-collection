import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GSS Collection',
    short_name: 'GSS',
    description: 'Handcrafted 925 sterling silver rings and natural untreated gemstones.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#0B0B0B',
    icons: [
      {
        src: '/icons/192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
