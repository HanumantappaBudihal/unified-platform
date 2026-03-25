import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Authorization Server',
  description: 'OPA Policy Management Portal — manage roles, policies, and test authorization decisions',
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
