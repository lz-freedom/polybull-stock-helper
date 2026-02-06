'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ConsensusReport, ModelAnalysis, Stance } from '@features/agents/lib/schemas';
import { cn } from '@features/shared/lib/utils';

interface PulsePageProps {
    params: Promise<{ locale: string }>;
}

export default function PulsePage({ params }: PulsePageProps) {
    const [stockSymbol, setStockSymbol] = useState('AAPL');
    const [exchangeAcronym, setExchangeAcronym] = useState('NASDAQ');
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<ConsensusReport | null>(null);
    const [analyses, setAnalyses] = useState<ModelAnalysis[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setReport(null);
        setAnalyses([]);

        try {
            const response = await fetch('/api/agents/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mode: 'consensus',
                    messages: [
                        {
                            role: 'user',
                            content: `请对 ${stockSymbol} (${exchangeAcronym}) 进行共识分析`,
                        },
                    ],
                    options: {
                        stockSymbol,
                        exchangeAcronym,
                    },
                }),
            });

            if (!response.ok || !response.body) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to generate consensus report');
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
                        if (parsed.type === 'data-report') {
                            setReport(parsed.data?.report ?? null);
                        }
                        if (parsed.type === 'data-complete') {
                            const result = parsed.data?.result;
                            if (Array.isArray(result?.modelAnalyses)) {
                                setAnalyses(result.modelAnalyses);
                            }
                        }
                        if (parsed.type === 'data-error') {
                            setError(parsed.data?.message ?? 'Failed to generate consensus report');
                        }
                    } catch (err) {
                        console.warn('Failed to parse stream chunk', err);
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const getStanceColor = (stance: Stance) => {
        switch (stance) {
            case 'bullish':
                return 'bg-success/10 text-success hover:bg-success/10 border-success/30';
            case 'bearish':
                return 'bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/30';
            case 'neutral':
                return 'bg-muted text-muted-foreground hover:bg-muted border-border';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getStanceIcon = (stance: Stance) => {
        switch (stance) {
            case 'bullish':
                return <TrendingUp className="h-4 w-4 mr-1" />;
            case 'bearish':
                return <TrendingDown className="h-4 w-4 mr-1" />;
            case 'neutral':
                return <Minus className="h-4 w-4 mr-1" />;
        }
    };

    return (
        <div className="flex-1 p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Market Pulse</h1>
                <p className="text-muted-foreground">
                    Generate AI-powered consensus reports for any stock using multi-agent analysis.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generate Report</CardTitle>
                    <CardDescription>Enter a stock symbol to start the consensus analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="symbol">Stock Symbol</Label>
                            <Input
                                id="symbol"
                                placeholder="AAPL"
                                value={stockSymbol}
                                onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="exchange">Exchange</Label>
                            <Input
                                id="exchange"
                                placeholder="NASDAQ"
                                value={exchangeAcronym}
                                onChange={(e) => setExchangeAcronym(e.target.value.toUpperCase())}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Activity className="mr-2 h-4 w-4" />
                                    Generate Analysis
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-4 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            {report && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-2 border-primary/10 bg-gradient-to-br from-card to-primary/5">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl">{report.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                        Consensus Confidence: {report.overallConfidence}%
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className={cn('px-4 py-1.5 text-base font-semibold', getStanceColor(report.overallStance))}>
                                    {getStanceIcon(report.overallStance)}
                                    {report.overallStance.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-2 flex items-center">
                                    <Activity className="h-4 w-4 mr-2 text-primary" />
                                    Executive Summary
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {report.overallSummary}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Consensus Points</h3>
                                    <ul className="space-y-2">
                                        {report.consensusPoints.map((point, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                                                <span>{point.point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Key Disagreements</h3>
                                    <ul className="space-y-2">
                                        {report.disagreementPoints.map((point, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                                                <span className="font-medium text-muted-foreground">{point.topic}:</span>
                                                <span className="text-muted-foreground">
                                                    {point.positions.length} divergent views
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Model Perspectives</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {analyses.map((analysis) => (
                                <Card key={analysis.modelId} className="flex flex-col h-full hover:shadow-md transition-all">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {analysis.modelId}
                                            </Badge>
                                            <Badge variant="outline" className={getStanceColor(analysis.stance)}>
                                                {analysis.stance}
                                            </Badge>
                                        </div>
                                        <CardDescription className="font-medium text-primary line-clamp-2">
                                            "{analysis.stanceSummary}"
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4 text-sm">
                                        <div>
                                            <p className="font-semibold mb-1 text-xs text-muted-foreground">KEY POINTS</p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                {analysis.keyPoints.slice(0, 3).map((point, i) => (
                                                    <li key={i} className="line-clamp-2">{point}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-semibold mb-1 text-xs text-muted-foreground">RISKS</p>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                {analysis.risks.slice(0, 2).map((risk, i) => (
                                                    <li key={i} className="line-clamp-2">{risk}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
