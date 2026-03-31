import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: {
    default: 'PayrollEngine',
    template: '%s | PayrollEngine',
  },
  description: 'US Payroll Tax Management Platform for Employers',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-surface text-slate-900 antialiased">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
