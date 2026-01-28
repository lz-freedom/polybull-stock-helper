'use client';

import { useEffect, useState, useMemo } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { cn } from '@/lib/utils';
import { AgentRunTimeline } from './agent-run-timeline';
import { ConsensusReportView } from './consensus-report';
import { ResearchReportView } from './research-report';
import { StreamableReportView } from './streamable-report-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { NinePartReport, ConsensusReport, StreamableReport } from '../lib/schemas';
import { NinePartReportSchema, ConsensusReportSchema, StreamableReportSchema } from '../lib/schemas';

// ============================================================
// ReportViewer - 报告查看器组件
// 支持流式渲染 (useObject) 和静态展示两种模式
// ============================================================

interface ReportViewerProps {
    agentRunId: number;
    agentType: 'consensus' | 'research' | 'qa';
    initialReport?: NinePartReport | ConsensusReport | StreamableReport | null;
    initialStatus?: string;
    reportTitle?: string;
    reportSummary?: string;
    isStreaming?: boolean;
    locale?: string;
    className?: string;
}

export function ReportViewer({
    agentRunId,
    agentType,
    initialReport,
    initialStatus,
    reportTitle,
    reportSummary,
    isStreaming = false,
    className,
}: ReportViewerProps) {
    const [runStatus, setRunStatus] = useState(initialStatus || 'pending');
    const [showTimeline, setShowTimeline] = useState(isStreaming);

    const [report, setReport] = useState<NinePartReport | ConsensusReport | StreamableReport | null>(initialReport || null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // If initialStatus is pending, we assume streaming/loading
    // If completed, we show initialReport
    
    // Poll for report content when timeline completes
    const fetchReport = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/mastra/workflows/${agentType}/result?runId=${agentRunId}`);
            if (!res.ok) throw new Error('Failed to fetch report');
            const data = await res.json();
            
            // data.report contains the report object
            // If it has structuredData, we use that if it matches StreamableReport
            // Or we check if data.report matches NinePartReport/ConsensusReport
            
            if (data.report) {
                // If the report has structuredData matching the new schema
                if (data.report.structuredData && isStreamableReport(data.report.structuredData)) {
                    setReport(data.report.structuredData);
                } else {
                    // Legacy fallback
                    setReport(data.report);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    // Timeline 完成回调
    const handleTimelineComplete = () => {
        setRunStatus('completed');
        setShowTimeline(false);
        fetchReport();
    };

    // If isStreaming is true, we start by showing timeline.
    // If we have initialReport, we show it.
    
    useEffect(() => {
        if (!isStreaming && initialReport) {
            setReport(initialReport);
        }
    }, [initialReport, isStreaming]);

    const isStreamableReport = (r: any): r is StreamableReport => {
        return r && 'blocks' in r && Array.isArray(r.blocks);
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* 报告标题和摘要 */}
            {(reportTitle || reportSummary) && (
                <div className="mb-6">
                    {reportTitle && (
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                            {reportTitle}
                        </h1>
                    )}
                    {reportSummary && (
                        <p className="text-gray-600 dark:text-gray-400">{reportSummary}</p>
                    )}
                </div>
            )}

            {/* Phase 1: Mastra 事件时间线 (运行中显示) */}
            {showTimeline && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            分析进度
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AgentRunTimeline
                            runId={agentRunId}
                            agentType={agentType}
                            onComplete={handleTimelineComplete}
                        />
                    </CardContent>
                </Card>
            )}

            {/* 加载/错误状态 */}
            {isLoading && !report && (
                <div className="text-center py-8 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>正在加载报告...</p>
                </div>
            )}

            {error && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="py-4">
                        <p className="text-red-600 dark:text-red-400">
                            加载报告时发生错误: {error.message}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Phase 2: 报告内容 (流式或静态) */}
            {report && (
                <>
                    {isStreamableReport(report) ? (
                        <StreamableReportView report={report} />
                    ) : (
                        <>
                            {agentType === 'research' ? (
                                <ResearchReportView report={report as Partial<NinePartReport>} />
                            ) : (
                                <ConsensusReportView report={report as Partial<ConsensusReport>} />
                            )}
                        </>
                    )}
                </>
            )}

            {/* 无数据且非加载状态 */}
            {!report && !isLoading && !error && runStatus === 'completed' && (
                <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                        <p>暂无报告数据</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
