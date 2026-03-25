import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from './components/Sidebar';

export const metadata: Metadata = {
  title: 'Health Aggregation',
  description: 'Infrastructure health monitoring with Uptime Kuma',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
