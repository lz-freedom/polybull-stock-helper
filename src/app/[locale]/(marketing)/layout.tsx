import { SessionProvider } from '@features/shared/providers/session-provider';

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <SessionProvider>{children}</SessionProvider>;
}
