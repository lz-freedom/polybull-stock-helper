'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import type { ConsensusReport } from '../lib/schemas';

interface ConsensusReportProps {
    report: Partial<ConsensusReport>;
    className?: string;
}

function StanceIcon({ stance }: { stance: string }) {
    switch (stance) {
        case 'bullish':
            return <TrendingUp className="h-4 w-4 text-green-500" />;
        case 'bearish':
            return <TrendingDown className="h-4 w-4 text-red-500" />;
        default:
            return <Minus className="h-4 w-4 text-gray-400" />;
    }
}

function getStanceLabel(stance: string): string {
    switch (stance) {
        case 'bullish':
            return '看涨';
        case 'bearish':
            return '看跌';
        case 'neutral':
            return '中性';
        default:
            return stance;
    }
}

function getRecommendationLabel(recommendation: string): string {
    switch (recommendation) {
        case 'strong_buy':
            return '强烈买入';
        case 'buy':
            return '买入';
        case 'hold':
            return '持有';
        case 'sell':
            return '卖出';
        case 'strong_sell':
            return '强烈卖出';
        default:
            return recommendation;
    }
}

function getRecommendationColor(recommendation: string): string {
    switch (recommendation) {
        case 'strong_buy':
            return 'bg-green-600 hover:bg-green-700';
        case 'buy':
            return 'bg-green-500 hover:bg-green-600';
        case 'hold':
            return 'bg-yellow-500 hover:bg-yellow-600';
        case 'sell':
            return 'bg-red-500 hover:bg-red-600';
        case 'strong_sell':
            return 'bg-red-600 hover:bg-red-700';
        default:
            return 'bg-gray-500 hover:bg-gray-600';
    }
}

function getAgreementLabel(level: string): string {
    switch (level) {
        case 'unanimous':
            return '一致同意';
        case 'majority':
            return '多数同意';
        case 'split':
            return '存在分歧';
        default:
            return level;
    }
}

// 共识报告渲染组件 - 展示多模型分析后的综合共识结果
export function ConsensusReportView({ report, className }: ConsensusReportProps) {
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

    const handleDisagreementClick = useCallback((topic: string) => {
        setExpandedTopic(prev => prev === topic ? null : topic);
    }, []);

    const handleDisagreementKeyDown = useCallback((e: React.KeyboardEvent, topic: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleDisagreementClick(topic);
        }
    }, [handleDisagreementClick]);

    if (!report) return null;

    return (
        <div className={cn('space-y-6', className)}>
            {report.title && (
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {report.title}
                    </h1>
                    {report.overallStance && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <StanceIcon stance={report.overallStance} />
                            <span className="text-lg">{getStanceLabel(report.overallStance)}</span>
                            {report.overallConfidence !== undefined && (
                                <Badge variant="secondary">{report.overallConfidence}% 置信度</Badge>
                            )}
                        </div>
                    )}
                </div>
            )}

            {report.overallSummary && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">执行摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-700 dark:text-gray-300">{report.overallSummary}</p>
                    </CardContent>
                </Card>
            )}

            {report.consensusPoints && report.consensusPoints.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            共识观点
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {report.consensusPoints.map((point) => (
                                <div key={point.point} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {point.point}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                            {getAgreementLabel(point.agreementLevel)}
                                        </Badge>
                                        <span className="text-xs text-gray-500">
                                            {point.supportingModels?.join(', ')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {report.disagreementPoints && report.disagreementPoints.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            分歧观点
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {report.disagreementPoints.map((point) => (
                                <button
                                    key={point.topic}
                                    type="button"
                                    className={cn(
                                        'w-full text-left p-3 rounded-lg border cursor-pointer transition-colors',
                                        expandedTopic === point.topic
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800',
                                    )}
                                    onClick={() => handleDisagreementClick(point.topic)}
                                >
                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {point.topic}
                                    </p>
                                    {expandedTopic === point.topic && point.positions && (
                                        <div className="mt-3 space-y-2">
                                            {point.positions.map((pos) => (
                                                <div
                                                    key={`${pos.stance}-${pos.rationale.slice(0, 20)}`}
                                                    className="flex items-start gap-2 p-2 bg-white dark:bg-gray-900 rounded"
                                                >
                                                    <StanceIcon stance={pos.stance} />
                                                    <div>
                                                        <p className="text-sm">{pos.rationale}</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {pos.models?.join(', ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {report.scores && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">综合评分</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {report.scores.dimension_details?.map((dim) => (
                                <div key={dim.dimension} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{dim.dimension}</p>
                                    <p className="text-2xl font-bold text-orange-600">{dim.score}</p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{dim.reasoning}</p>
                                </div>
                            ))}
                        </div>
                        {report.scores.final_verdict && (
                            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                                <p className="text-3xl font-bold text-orange-600">
                                    {report.scores.final_verdict.score}/10
                                </p>
                                <Badge 
                                    className={cn('mt-2', getRecommendationColor(report.scores.final_verdict.recommendation))}
                                >
                                    {getRecommendationLabel(report.scores.final_verdict.recommendation)}
                                </Badge>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    置信度: {report.scores.final_verdict.confidence}%
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {report.actionItems && report.actionItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">待验证事项</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-1">
                            {report.actionItems.map((item) => (
                                <li key={item} className="text-sm text-gray-600 dark:text-gray-400">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default ConsensusReportView;
