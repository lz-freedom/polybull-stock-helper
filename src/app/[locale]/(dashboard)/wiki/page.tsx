'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@features/shared/components/ui/card';
import { Button } from '@features/shared/components/ui/button';
import { Input } from '@features/shared/components/ui/input';
import { Textarea } from '@features/shared/components/ui/textarea';
import { Label } from '@features/shared/components/ui/label';
import { Search, BookOpen, FileText, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Evidence {
    claim: string;
    source: string;
    confidence: 'high' | 'medium' | 'low';
    dataPoint?: string;
}

interface ResearchSection {
    heading: string;
    content: string;
    evidence: Evidence[];
}

interface ResearchReport {
    title: string;
    executiveSummary: string;
    sections: ResearchSection[];
    conclusion: string;
    limitations: string[];
    suggestedFollowUp: string[];
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

function ConfidenceBadge({ confidence }: { confidence: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                confidence === 'high' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                confidence === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                confidence === 'low' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
            const response = await fetch('/api/agents/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stockSymbol: stockSymbol.toUpperCase(),
                    exchangeAcronym: exchangeAcronym.toUpperCase(),
                    query,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setReport(data.report);
                setPlan(data.plan);
            } else {
                setError(data.error || 'Failed to generate research');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Deep Research
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Generate comprehensive research reports with evidence-backed findings
                    </p>
                </div>

                {/* Input Form */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="h-5 w-5 text-orange-500" />
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
                            className="w-full bg-orange-600 hover:bg-orange-700"
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
                    <Card className="mb-8 border-red-200 dark:border-red-800">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
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
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                <strong>Main Question:</strong> {plan.mainQuestion}
                            </p>
                            <div className="space-y-2">
                                {plan.subQuestions.map((task, i) => (
                                    <div
                                        key={task.taskId}
                                        className="flex items-start gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                    >
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="font-medium">{task.role}:</span>{' '}
                                            <span className="text-gray-600 dark:text-gray-400">
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
                                    <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                                    <p className="text-gray-700 dark:text-gray-300">
                                        {report.executiveSummary}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sections */}
                        {report.sections.map((section, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-orange-500" />
                                        {section.heading}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                        {section.content}
                                    </p>
                                    {section.evidence.length > 0 && (
                                        <div className="border-t pt-4">
                                            <h4 className="text-sm font-medium text-gray-500 mb-2">
                                                Supporting Evidence
                                            </h4>
                                            <div className="space-y-2">
                                                {section.evidence.map((ev, j) => (
                                                    <div
                                                        key={j}
                                                        className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <span>{ev.claim}</span>
                                                            <ConfidenceBadge confidence={ev.confidence} />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
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
                        ))}

                        {/* Conclusion */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Conclusion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {report.conclusion}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Limitations & Follow-up */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base text-amber-600 dark:text-amber-400">
                                        Limitations
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {report.limitations.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base text-blue-600 dark:text-blue-400">
                                        Suggested Follow-up
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="space-y-2">
                                        {report.suggestedFollowUp.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <Search className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!report && !error && !isLoading && (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center">
                                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Start Your Research
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
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
