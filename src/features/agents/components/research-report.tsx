'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { NinePartReport, SectionContent } from '../lib/schemas';

interface ResearchReportProps {
    report: Partial<NinePartReport>;
    className?: string;
}

interface SectionMeta {
    key: keyof NinePartReport;
    label: string;
    icon: string;
}

const NINE_PART_SECTIONS: SectionMeta[] = [
    { key: 'core_overview', label: '核心概览', icon: '📊' },
    { key: 'business_model', label: '商业模式', icon: '💼' },
    { key: 'competitive_advantage', label: '竞争优势', icon: '🏆' },
    { key: 'financial_quality', label: '财务质量', icon: '📈' },
    { key: 'governance', label: '管理层治理', icon: '👥' },
    { key: 'valuation', label: '估值分析', icon: '💰' },
    { key: 'future_outlook', label: '未来展望', icon: '🔮' },
    { key: 'risks', label: '风险提示', icon: '⚠️' },
    { key: 'conclusion', label: '投资结论', icon: '✅' },
];

interface SectionCardProps {
    section: SectionContent;
    label: string;
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
}

// 单章节卡片 - 支持折叠/展开
function SectionCard({ section, label, icon, isExpanded, onToggle }: SectionCardProps) {
    return (
        <Card className="overflow-hidden">
            <button
                type="button"
                className="w-full text-left p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <span className="font-semibold leading-none tracking-tight text-base">{section.title || label}</span>
                        {section.confidence !== undefined && (
                            <Badge variant="outline" className="ml-2">
                                {section.confidence}% 置信度
                            </Badge>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <CardContent className="border-t">
                    {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                关键要点
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                                {section.keyPoints.map((point) => (
                                    <li key={point} className="text-sm text-gray-600 dark:text-gray-400">
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {section.content && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                {section.content}
                            </div>
                        </div>
                    )}

                    {section.evidence && section.evidence.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                数据来源
                            </h4>
                            <div className="space-y-2">
                                {section.evidence.map((ev) => (
                                    <div
                                        key={`${ev.claim}-${ev.source}`}
                                        className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded"
                                    >
                                        <p className="font-medium">{ev.claim}</p>
                                        <p className="text-gray-500">{ev.source}</p>
                                        {ev.dataPoint && (
                                            <p className="text-gray-400 mt-1">{ev.dataPoint}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

// 九部分研究报告渲染组件 - 展示完整股票研究分析
export function ResearchReportView({ report, className }: ResearchReportProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['core_overview']));

    const toggleSection = useCallback((key: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const availableSections = useMemo(() => {
        return NINE_PART_SECTIONS.filter((s) => {
            const section = report[s.key];
            return section && (section.title || section.content || section.keyPoints?.length);
        });
    }, [report]);

    if (availableSections.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>正在生成报告...</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {availableSections.map(({ key, label, icon }) => {
                const section = report[key];
                if (!section) return null;

                return (
                    <SectionCard
                        key={key}
                        section={section}
                        label={label}
                        icon={icon}
                        isExpanded={expandedSections.has(key)}
                        onToggle={() => toggleSection(key)}
                    />
                );
            })}
        </div>
    );
}

export default ResearchReportView;
