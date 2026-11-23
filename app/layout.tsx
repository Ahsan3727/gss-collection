import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/store/Header';
import Footer from '@/components/store/Footer';
import AnnouncementBar from '@/components/store/AnnouncementBar';

export const metadata: Metadata = {
  title: 'GSS Collection | Silver Rings & Natural Gemstones',
  description: 'Handcrafted 925 sterling silver ladies rings, gents rings, and untreated natural gemstones.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-white text-ink antialiased">
        <AnnouncementBar />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
