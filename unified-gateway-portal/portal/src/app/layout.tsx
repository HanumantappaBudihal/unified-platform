import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Infrastructure Gateway',
  description: 'Unified portal for all centralized infrastructure servers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">
        <Sidebar />
        <main className="lg:ml-72 min-h-screen transition-all duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}
