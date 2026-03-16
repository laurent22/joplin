'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import './joplin.css';
import './globals.css';
import EmotionRegistry from './components/EmotionRegistry';
import StoreProvider from './components/StoreProvider';
import { useEffect } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    document.title = 'Create Next App';
  }, []);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreProvider>
          <EmotionRegistry>{children}</EmotionRegistry>
        </StoreProvider>
      </body>
    </html>
  );
}
