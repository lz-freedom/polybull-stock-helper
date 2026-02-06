'use client';

import { useEffect, useState, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportViewer } from '@/features/agents/components/report-viewer';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { getSharedContent } from '@/features/agents/actions/share';
import { Loader2 } from 'lucide-react';

interface SharePageProps {
    params: Promise<{
        locale: string;
        shareId: string;
    }>;
}

export default function SharePage({ params }: SharePageProps) {
    const { locale, shareId } = use(params);
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadContent = async () => {
            try {
                const result = await getSharedContent(shareId);
                if (!result || result.error) {
                    setError(result?.error || 'Content not found');
                } else {
                    setContent(result);
                }
            } catch (err) {
                setError('Failed to load shared content');
            } finally {
                setLoading(false);
            }
        };
        loadContent();
    }, [shareId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background dark:bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background dark:bg-background">
                <p className="text-muted-foreground">{error || 'Content not found'}</p>
                <Button asChild>
                    <Link href={`/${locale}`}>
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background dark:bg-background">
            <div className="container mx-auto max-w-4xl p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-xl font-semibold">Shared Report</h1>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}`}>
                            <Home className="mr-2 h-4 w-4" />
                            Open in iVibe
                        </Link>
                    </Button>
                </div>

                <ReportViewer
                    agentRunId={content.runId || 0}
                    agentType={content.type}
                    initialReport={content.report}
                    isStreaming={false}
                    initialStatus="completed"
                />
            </div>
        </div>
    );
}
