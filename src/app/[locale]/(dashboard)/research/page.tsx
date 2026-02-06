import { WorkflowStream } from '@/features/mastra/components/workflow-stream';
import { WorkflowReplay } from '@/features/mastra/components/workflow-replay';
import { setRequestLocale } from 'next-intl/server';

interface PageProps {
    params: Promise<{ locale: string }>;
}

export default async function ResearchPage({ params }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <div className="flex-1 p-6 h-[calc(100vh-4rem)] overflow-hidden">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Deep Research Agent</h1>
                <p className="text-muted-foreground">
                    Run autonomous research workflows with live thought streaming.
                </p>
            </div>
            <div className="space-y-8">
                <WorkflowStream />
                <WorkflowReplay />
            </div>
        </div>
    );
}
