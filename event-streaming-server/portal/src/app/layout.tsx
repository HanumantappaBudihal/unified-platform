import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Kafka Central Portal',
  description: 'Management portal for the centralized Kafka server',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto h-screen bg-slate-50">{children}</main>
      </body>
    </html>
  );
}
