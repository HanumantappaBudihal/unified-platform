import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Cache Server Portal',
  description: 'Redis Cluster Management Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-64 p-6 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
