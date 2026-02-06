// replay UI for workflow events
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DataMessagePart } from '@assistant-ui/react';
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react';

import { WorkflowEventSchema, type WorkflowEvent } from '../events/types';
import { DataPartList } from '@/components/assistant-ui/data-parts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@features/shared/lib/utils';

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2, 4] as const;
const MAX_DELAY_MS = 2000;

function formatDuration(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return '0s';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

interface WorkflowReplayProps {
    className?: string;
}

export function WorkflowReplay({ className }: WorkflowReplayProps) {
    const [workflowType, setWorkflowType] = useState<'research' | 'consensus'>('research');
    const [runId, setRunId] = useState('');
    const [events, setEvents] = useState<WorkflowEvent[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playIndex, setPlayIndex] = useState(0);
    const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);

    const totalDuration = useMemo(() => {
        if (events.length < 2) return 0;
        return Math.max(events[events.length - 1].timestamp - events[0].timestamp, 0);
    }, [events]);

    const elapsed = useMemo(() => {
        if (events.length === 0 || playIndex === 0) return 0;
        const current = events[Math.min(playIndex - 1, events.length - 1)];
        return Math.max(current.timestamp - events[0].timestamp, 0);
    }, [events, playIndex]);

    const dataParts = useMemo(
        () =>
            events.slice(0, playIndex).map((event) => ({
                type: 'data' as const,
                name: event.type,
                data: event,
            })) as DataMessagePart[],
        [events, playIndex],
    );

    useEffect(() => {
        if (!isPlaying) return;
        if (playIndex >= events.length) {
            setIsPlaying(false);
            return;
        }

        const current = events[playIndex];
        const previous = playIndex > 0 ? events[playIndex - 1] : null;
        const delta = previous ? Math.max(current.timestamp - previous.timestamp, 0) : 0;
        const delay = Math.min(delta / speed, MAX_DELAY_MS);
        const timer = setTimeout(() => {
            setPlayIndex((prev) => Math.min(prev + 1, events.length));
        }, delay);

        return () => clearTimeout(timer);
    }, [events, isPlaying, playIndex, speed]);

    const handleLoad = async () => {
        if (!runId.trim()) return;
        setIsLoading(true);
        setError(null);
        setIsPlaying(false);
        setPlayIndex(0);
        try {
            const response = await fetch(
                `/api/agents/chat?action=get_events&run_id=${runId.trim()}&mode=${workflowType}`,
            );
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to load events');
            }
            const data = await response.json();
            const parsed = (data.events ?? [])
                .map((row: { payload?: unknown; createdAt?: string }) => {
                    const result = WorkflowEventSchema.safeParse(row.payload);
                    if (!result.success) return null;
                    return result.data;
                })
                .filter(Boolean) as WorkflowEvent[];
            setEvents(parsed);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load events');
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlay = () => {
        if (events.length === 0) return;
        if (!isPlaying && playIndex === 0) {
            setPlayIndex(1);
        }
        setIsPlaying((prev) => !prev);
    };

    const handleReset = () => {
        setIsPlaying(false);
        setPlayIndex(0);
    };

    const progress = events.length === 0 ? 0 : playIndex / events.length;

    return (
        <div className={cn('space-y-4', className)}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Data Stream Replay</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Workflow Type</Label>
                            <RadioGroup
                                value={workflowType}
                                onValueChange={(val: 'research' | 'consensus') => setWorkflowType(val)}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="research" id="replay-research" />
                                    <Label htmlFor="replay-research" className="cursor-pointer font-normal">
                                        Research
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="consensus" id="replay-consensus" />
                                    <Label htmlFor="replay-consensus" className="cursor-pointer font-normal">
                                        Consensus
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Run ID</Label>
                            <Input
                                placeholder="e.g. 42"
                                value={runId}
                                onChange={(e) => setRunId(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleLoad} disabled={isLoading || !runId.trim()} className="w-full">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading
                                    </>
                                ) : (
                                    'Load Replay'
                                )}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                        <Button variant="outline" onClick={togglePlay} disabled={events.length === 0}>
                            {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                            {isPlaying ? 'Pause' : 'Play'}
                        </Button>
                        <Button variant="ghost" onClick={handleReset} disabled={events.length === 0}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Speed</span>
                            <select
                                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                                value={speed}
                                onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEED_OPTIONS)[number])}
                            >
                                {SPEED_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}x
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {playIndex}/{events.length} events · {formatDuration(elapsed)} / {formatDuration(totalDuration)}
                        </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min(progress * 100, 100)}%` }}
                        />
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={events.length}
                        value={playIndex}
                        onChange={(e) => {
                            setIsPlaying(false);
                            setPlayIndex(Number(e.target.value));
                        }}
                        className="w-full"
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Event View</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[420px] overflow-y-auto">
                    {dataParts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Load a run to start replay.</div>
                    ) : (
                        <DataPartList parts={dataParts} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
