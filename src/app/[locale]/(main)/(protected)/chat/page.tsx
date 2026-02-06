import Link from 'next/link';

interface ChatPageProps {
    params: Promise<{ locale: string }>;
}

export default async function ChatEntryPage({ params }: ChatPageProps) {
    const { locale } = await params;

    return (
        <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-5 text-center">
                <p className="text-sm text-muted-foreground">请选择历史会话，或新建一个会话。</p>
                <Link
                    href={`/${locale}/chat/new`}
                    className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                    新建会话
                </Link>
            </div>
        </div>
    );
}
