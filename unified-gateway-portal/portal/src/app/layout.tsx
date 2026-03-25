import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Infrastructure Gateway',
  description: 'Unified portal for all centralized infrastructure servers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-800">
        <Providers>
          <Sidebar />
          <main className="lg:ml-72 min-h-screen transition-all duration-300">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
