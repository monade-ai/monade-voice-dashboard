// app/layout.tsx (Server Component)

import type { Metadata } from 'next';
import localFont from 'next/font/local';

import './globals.css';
import ClientLayout from './client-layout';

const geistSans = localFont({
  src: [
    {
      path: '../../public/fonts/geist/Geist[wght].woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/geist/Geist-Italic[wght].woff2',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = localFont({
  src: [
    {
      path: '../../public/fonts/geist-mono/GeistMono[wght].woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../../public/fonts/geist-mono/GeistMono-Italic[wght].woff2',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'monade.ai',
  description: 'Your AI-powered call assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
