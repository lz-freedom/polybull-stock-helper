'use client';

import { useState, useRef, useEffect } from 'react';
import { WorkflowEvent, parseEvent } from '../events/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@features/shared/lib/utils';
import { 
    Loader2, 
    Play, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    ChevronRight, 
    ChevronDown, 
    Brain, 
    FileText,
    Activity,
    GitBranch
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
    const [expandedArtifacts, setExpandedArtifacts] = useState<Record<string, boolean>>({});
    
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
        setExpandedArtifacts({});

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

    const toggleArtifact = (id: string) => {
        setExpandedArtifacts(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
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
                        
                        {events.map((event, index) => {
                            const time = new Date(event.timestamp).toLocaleTimeString();
                            
                            if (event.type === 'stage') {
                                return (
                                    <div key={index} className="flex items-center gap-3 py-2 border-b border-border/50">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                            STAGE
                                        </Badge>
                                        <span className="font-medium text-sm">{event.stage}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{time}</span>
                                    </div>
                                );
                            }

                            if (event.type === 'progress') {
                                return (
                                    <div key={index} className="pl-4 border-l-2 border-muted py-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>{event.stepId}</span>
                                            <span className="text-muted-foreground">{event.percent}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-orange-500 transition-all duration-300"
                                                style={{ width: `${event.percent}%` }}
                                            />
                                        </div>
                                        {event.message && (
                                            <p className="text-xs text-muted-foreground mt-1">{event.message}</p>
                                        )}
                                    </div>
                                );
                            }

                            if (event.type === 'tool-call') {
                                return (
                                    <div key={index} className="pl-4 border-l-2 border-indigo-200 py-1 bg-indigo-50 dark:bg-indigo-950 rounded-r text-sm">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] h-5 border-indigo-200 text-indigo-700">TOOL</Badge>
                                            <span className="font-mono text-xs">{event.toolName}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground truncate font-mono opacity-70">
                                            {JSON.stringify(event.args)}
                                        </div>
                                    </div>
                                );
                            }

                            if (event.type === 'divergence') {
                                return (
                                    <div key={index} className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-2">
                                            <GitBranch className="h-4 w-4" />
                                            <span>Divergence: {event.topic}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {event.views.map((view, vIndex) => (
                                                <div key={vIndex} className="text-xs bg-white dark:bg-slate-950 p-2 rounded border border-amber-100 dark:border-amber-900">
                                                    <div className="flex justify-between font-semibold mb-1">
                                                        <span>{view.analyst}</span>
                                                        <Badge variant={view.stance === 'bullish' ? 'default' : view.stance === 'bearish' ? 'destructive' : 'secondary'} className="text-[10px] py-0 h-4">
                                                            {view.stance}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-muted-foreground">{view.reasoning}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            if (event.type === 'artifact') {
                                const id = event.stepId + event.timestamp;
                                const isExpanded = expandedArtifacts[id];
                                return (
                                    <div key={index} className="border rounded-lg bg-card overflow-hidden">
                                        <button 
                                            onClick={() => toggleArtifact(id)}
                                            className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span className="capitalize">{event.artifactType}</span>
                                            </div>
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </button>
                                        {isExpanded && (
                                            <div className="p-3 border-t bg-muted overflow-x-auto">
                                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                                    {typeof event.data === 'string' 
                                                        ? event.data 
                                                        : JSON.stringify(event.data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            if (event.type === 'error') {
                                return (
                                    <div key={index} className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-semibold">Error</p>
                                            <p>{event.message}</p>
                                        </div>
                                    </div>
                                );
                            }

                            return null;
                        })}
                        <div ref={streamEndRef} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
