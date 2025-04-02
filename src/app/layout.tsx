

import React from 'react';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from '../components/sidebar';
import { Toaster } from 'sonner';
import { PipecatProvider } from './assistants/providers/pipcat-provider';

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calllive.ai",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster richColors position="bottom-center" />
         <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-[#f8f5f0] text-gray-800">
          <PipecatProvider>
            {children}
            </PipecatProvider>
          </main>
         </div>
      </body>
    </html>
  );
}
