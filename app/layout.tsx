import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Polybull - Build Your SaaS Faster',
  description: 'A modern SaaS starter template with Next.js, PostgreSQL, and Stripe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
