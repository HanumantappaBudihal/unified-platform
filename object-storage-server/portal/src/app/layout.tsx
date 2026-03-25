import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Storage Server Portal',
  description: 'Centralized Object Storage Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Sidebar />
        <main className="ml-64 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
