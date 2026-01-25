import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'iVibeFinance - Smart Stock Analysis',
    description: 'AI-powered stock analysis and financial insights platform',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
