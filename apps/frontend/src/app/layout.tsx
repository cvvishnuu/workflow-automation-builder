/**
 * Root Layout
 * Next.js 14 App Router layout component
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClerkProviderWrapper } from '@/components/providers/clerk-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workflow Automation Platform',
  description: 'Build and automate workflows visually',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProviderWrapper>
      <html lang="en">
        <body className={inter.className}>{children}</body>
      </html>
    </ClerkProviderWrapper>
  );
}
