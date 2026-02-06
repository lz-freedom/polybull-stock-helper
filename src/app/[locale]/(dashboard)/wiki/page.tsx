'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Search, BookOpen, FileText, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evidence {
    claim: string;
    source: string;
    confidence: 'high' | 'medium' | 'low';
    dataPoint?: string;
}

interface ResearchReport {
    title: string;
    summary: string;
    modules: Record<string, {
        title?: string;
        content?: string;
        keyPoints?: string[];
        evidence?: Evidence[];
        confidence?: number;
    }>;
    limitations?: string[];
    suggestedFollowUp?: string[];
    citations?: Evidence[];
}

interface ResearchTask {
    taskId: string;
    question: string;
    role: string;
    priority: 'high' | 'medium' | 'low';
}

interface ResearchPlan {
    mainQuestion: string;
    subQuestions: ResearchTask[];
    expectedDeliverables: string[];
}

const REPORT_MODULES = [
    { key: 'business', label: '业务' },
    { key: 'revenue', label: '收入' },
    { key: 'industry', label: '行业' },
    { key: 'competition', label: '竞争' },
    { key: 'financial', label: '财务' },
    { key: 'risk', label: '风险' },
    { key: 'management', label: '管理层' },
    { key: 'scenario', label: '情景' },
    { key: 'valuation', label: '估值' },
    { key: 'long_thesis', label: '长期论文' },
] as const;

function ConfidenceBadge({ confidence }: { confidence: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                confidence === 'high' && 'bg-success/10 text-success dark:bg-success/10 dark:text-success',
                confidence === 'medium' && 'bg-warning/10 text-warning dark:bg-warning/10 dark:text-warning',
                confidence === 'low' && 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive',
            )}
        >
            {confidence}
        </span>
    );
}

export default function WikiPage() {
    const { locale } = useParams();
    const [stockSymbol, setStockSymbol] = useState('');
    const [exchangeAcronym, setExchangeAcronym] = useState('');
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<ResearchReport | null>(null);
    const [plan, setPlan] = useState<ResearchPlan | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function generateResearch() {
        if (!stockSymbol || !exchangeAcronym || !query) return;

        setIsLoading(true);
        setError(null);
        setReport(null);
        setPlan(null);

        try {
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'research',
                    messages: [
                        {
                            role: 'user',
                            content: query,
                        },
                    ],
                    options: {
                        stockSymbol: stockSymbol.toUpperCase(),
                        exchangeAcronym: exchangeAcronym.toUpperCase(),
                        query,
                    },
                }),
            });

            if (!response.ok || !response.body) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to start research');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const payload = line.replace(/^data:\s*/, '');
                    try {
                        const parsed = JSON.parse(payload) as { type?: string; data?: any };
                        const chunkType = parsed.type ?? '';
                        if (chunkType === 'data-report') {
                            setReport(parsed.data?.report ?? null);
                        }
                        if (chunkType === 'data-complete') {
                            const result = parsed.data?.result;
                            if (result?.plan) setPlan(result.plan);
                        }
                        if (chunkType === 'data-error') {
                            setError(parsed.data?.message ?? 'Failed to generate research');
                        }
                    } catch (err) {
                        console.warn('Failed to parse stream chunk', err);
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex-1 p-8 bg-muted min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-muted-foreground">
                        Deep Research
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Generate comprehensive research reports with evidence-backed findings
                    </p>
                </div>

                {/* Input Form */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="h-5 w-5 text-warning" />
                            Research Query
                        </CardTitle>
                        <CardDescription>
                            Enter a stock and your research question to generate a detailed report
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="symbol">Stock Symbol</Label>
                                <Input
                                    id="symbol"
                                    placeholder="e.g., AAPL"
                                    value={stockSymbol}
                                    onChange={(e) => setStockSymbol(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="exchange">Exchange</Label>
                                <Input
                                    id="exchange"
                                    placeholder="e.g., NASDAQ"
                                    value={exchangeAcronym}
                                    onChange={(e) => setExchangeAcronym(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="query">Research Question</Label>
                            <Textarea
                                id="query"
                                placeholder="e.g., What are the key growth drivers and risks for this company over the next 12 months?"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <Button
                            onClick={generateResearch}
                            disabled={isLoading || !stockSymbol || !exchangeAcronym || !query}
                            className="w-full bg-warning/10 hover:bg-warning/10"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Researching...
                                </>
                            ) : (
                                <>
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Start Research
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Error Display */}
                {error && (
                    <Card className="mb-8 border-destructive/30 dark:border-destructive/30">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-destructive dark:text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                <span>{error}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Research Plan */}
                {plan && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-base">Research Plan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-3">
                                <strong>Main Question:</strong> {plan.mainQuestion}
                            </p>
                            <div className="space-y-2">
                                {plan.subQuestions.map((task, i) => (
                                    <div
                                        key={task.taskId}
                                        className="flex items-start gap-2 text-sm p-2 bg-muted rounded"
                                    >
                                        <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium">{task.role}:</span>{' '}
                                            <span className="text-muted-foreground">
                                                {task.question}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Report Display */}
                {report && (
                    <div className="space-y-6">
                        {/* Executive Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl">{report.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose dark:prose-invert max-w-none">
                                    <h3 className="text-lg font-semibold mb-2">Summary</h3>
                                    <p className="text-muted-foreground">
                                        {report.summary}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sections */}
                        {REPORT_MODULES.map((module) => {
                            const section = report.modules?.[module.key];
                            if (!section) return null;
                            const hasEvidence = Array.isArray(section.evidence) && section.evidence.length > 0;

                            return (
                                <Card key={module.key}>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-warning" />
                                            {section.title || module.label}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {section.keyPoints && section.keyPoints.length > 0 && (
                                            <div className="space-y-1">
                                                {section.keyPoints.map((point) => (
                                                    <div key={point} className="text-sm text-muted-foreground">
                                                        • {point}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {section.content && (
                                            <p className="text-muted-foreground whitespace-pre-line">
                                                {section.content}
                                            </p>
                                        )}
                                        {hasEvidence && (
                                            <div className="border-t pt-4">
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                                    Supporting Evidence
                                                </h4>
                                                <div className="space-y-2">
                                                    {section.evidence?.map((ev, j) => (
                                                        <div
                                                            key={`${ev.claim}-${j}`}
                                                            className="text-sm p-2 bg-muted rounded"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span>{ev.claim}</span>
                                                                <ConfidenceBadge confidence={ev.confidence} />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                Source: {ev.source}
                                                                {ev.dataPoint && ` • ${ev.dataPoint}`}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {/* Limitations & Follow-up */}
                        {(report.limitations || report.suggestedFollowUp) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Array.isArray(report.limitations) && report.limitations.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base text-warning dark:text-warning">
                                                Limitations
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {report.limitations.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}

                                {Array.isArray(report.suggestedFollowUp) && report.suggestedFollowUp.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base text-info dark:text-info">
                                                Suggested Follow-up
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {report.suggestedFollowUp.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <Search className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!report && !error && !isLoading && (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-muted-foreground mb-2">
                                    Start Your Research
                                </h2>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Enter a stock symbol and your research question to generate
                                    a comprehensive report with evidence-backed findings.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
