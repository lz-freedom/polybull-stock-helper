'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { DataMessagePart } from '@assistant-ui/react';
import { WorkflowEvent, parseEvent } from '../events/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataPartList } from '@/components/assistant-ui/data-parts';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@features/shared/lib/utils';
import { 
    Loader2, 
    Play, 
    CheckCircle, 
    XCircle, 
    Brain, 
    FileText,
    Activity
} from 'lucide-react';

interface WorkflowStreamProps {
    className?: string;
}

export function WorkflowStream({ className }: WorkflowStreamProps) {
    const [stockSymbol, setStockSymbol] = useState('');
    const [exchangeAcronym, setExchangeAcronym] = useState('');
    const [researchQuery, setResearchQuery] = useState('');
    const [workflowType, setWorkflowType] = useState<'research' | 'consensus'>('research');
    const [isRunning, setIsRunning] = useState(false);
    const [events, setEvents] = useState<WorkflowEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [finalResult, setFinalResult] = useState<unknown | null>(null);
    const dataParts = useMemo(
        () =>
            events.map((event) => ({
                type: 'data' as const,
                name: event.type,
                data: event,
            })) as DataMessagePart[],
        [events],
    );
    
    const streamEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockSymbol || !exchangeAcronym) return;
        if (workflowType === 'research' && !researchQuery) return;

        setEvents([]);
        setError(null);
        setFinalResult(null);
        setIsRunning(true);

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const startRes = await fetch(`/api/mastra/workflows/${workflowType}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stockSymbol,
                    exchangeAcronym,
                    ...(workflowType === 'research' ? { query: researchQuery } : {}),
                }),
                signal: abortController.signal,
            });

            if (!startRes.ok) {
                const errorData = await startRes.json();
                throw new Error(errorData.error || 'Failed to start workflow');
            }

            const { runId } = await startRes.json();

            const streamRes = await fetch(`/api/mastra/workflows/${workflowType}/stream?runId=${runId}`, {
                signal: abortController.signal,
            });

            if (!streamRes.ok || !streamRes.body) {
                throw new Error('Failed to connect to event stream');
            }

            const reader = streamRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const event = parseEvent(line);
                    if (event) {
                        setEvents(prev => [...prev, event]);
                        
                        if (event.type === 'complete') {
                            setFinalResult(event.result);
                            setIsRunning(false);
                        } else if (event.type === 'error') {
                            setError(event.message);
                            setIsRunning(false);
                        }
                    }
                }
            }

            setIsRunning(false);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                setIsRunning(false);
            } else {
                console.error(err);
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
                setIsRunning(false);
            }
        } finally {
            if (!abortController.signal.aborted) {
                setIsRunning(false);
            }
        }
    };


    return (
        <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-100px)]', className)}>
            <div className="flex flex-col gap-6 overflow-hidden">
                <Card>
                    <CardHeader>
                        <CardTitle>Research Parameters</CardTitle>
                        <CardDescription>Start a new stock research workflow</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleStart} className="flex flex-col gap-4">
                            <div className="space-y-3">
                                <Label>Workflow Type</Label>
                                <RadioGroup 
                                    value={workflowType} 
                                    onValueChange={(val: 'research' | 'consensus') => setWorkflowType(val)}
                                    className="flex gap-4"
                                    disabled={isRunning}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="research" id="r1" />
                                        <Label htmlFor="r1" className="cursor-pointer font-normal">Deep Research</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="consensus" id="r2" />
                                        <Label htmlFor="r2" className="cursor-pointer font-normal">Analyst Consensus</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Stock Symbol</Label>
                                    <Input
                                        placeholder="AAPL"
                                        value={stockSymbol}
                                        onChange={e => setStockSymbol(e.target.value.toUpperCase())}
                                        disabled={isRunning}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Exchange</Label>
                                    <Input
                                        placeholder="NASDAQ"
                                        value={exchangeAcronym}
                                        onChange={e => setExchangeAcronym(e.target.value.toUpperCase())}
                                        disabled={isRunning}
                                    />
                                </div>
                            </div>
                            {workflowType === 'research' && (
                                <div className="space-y-2">
                                    <Label>Research Question</Label>
                                    <Input
                                        placeholder="What are the key risks for AAPL in 2024?"
                                        value={researchQuery}
                                        onChange={e => setResearchQuery(e.target.value)}
                                        disabled={isRunning}
                                    />
                                </div>
                            )}
                            <Button
                                type="submit"
                                disabled={
                                    !stockSymbol ||
                                    !exchangeAcronym ||
                                    isRunning ||
                                    (workflowType === 'research' && !researchQuery)
                                }
                                className="w-full"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running {workflowType === 'research' ? 'Research' : 'Consensus'}...
                                    </>
                                ) : (
                                    <>
                                        <Play className="mr-2 h-4 w-4" />
                                        Start Workflow
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {error && (
                    <div className="bg-destructive text-destructive-foreground p-4 rounded-lg flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                )}

                {finalResult ? (
                    <Card className="flex-1 overflow-hidden flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Final Report
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-auto">
                            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                                {JSON.stringify(finalResult, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted rounded-xl border border-dashed">
                        <div className="text-center">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>Analysis results will appear here</p>
                        </div>
                    </div>
                )}
            </div>

            <Card className="flex flex-col overflow-hidden h-full">
                        <CardHeader className="pb-3 border-b bg-muted">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Brain className="h-5 w-5 text-orange-500" />
                                    Agent Thought Process
                                </CardTitle>
                                {isRunning && (
                                    <Badge variant="outline" className="animate-pulse text-orange-500 border-orange-200 bg-orange-50">
                                        Live
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50 dark:bg-slate-950">
                    <div className="p-4 space-y-4">
                        {events.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <Activity className="h-8 w-8 mx-auto mb-3 opacity-20" />
                                <p>Waiting for events...</p>
                            </div>
                        )}
                        
                        <DataPartList parts={dataParts} />
                        <div ref={streamEndRef} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
