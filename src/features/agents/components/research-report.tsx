'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { TenPartReport, SectionContent, ResearchReport } from '../lib/schemas';

interface ResearchReportProps {
    report: Partial<TenPartReport> | Partial<ResearchReport>;
    className?: string;
}

interface SectionMeta {
    key: Exclude<keyof TenPartReport, 'title' | 'summary'>;
    label: string;
    icon: string;
}

const TEN_PART_SECTIONS: SectionMeta[] = [
    { key: 'business', label: '业务', icon: '📊' },
    { key: 'revenue', label: '收入', icon: '💼' },
    { key: 'industry', label: '行业', icon: '🏭' },
    { key: 'competition', label: '竞争', icon: '🏆' },
    { key: 'financial', label: '财务', icon: '📈' },
    { key: 'risk', label: '风险', icon: '⚠️' },
    { key: 'management', label: '管理层', icon: '👥' },
    { key: 'scenario', label: '情景', icon: '🧭' },
    { key: 'valuation', label: '估值', icon: '💰' },
    { key: 'long_thesis', label: '长期论文', icon: '🧠' },
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
                className="w-full text-left p-6 cursor-pointer hover:bg-muted dark:hover:bg-muted transition-colors"
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
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <CardContent className="border-t">
                    {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                关键要点
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                                {section.keyPoints.map((point) => (
                                    <li key={point} className="text-sm text-muted-foreground">
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {section.content && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-muted-foreground">
                                {section.content}
                            </div>
                        </div>
                    )}

                    {section.evidence && section.evidence.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                数据来源
                            </h4>
                            <div className="space-y-2">
                                {section.evidence.map((ev) => (
                                    <div
                                        key={`${ev.claim}-${ev.source}`}
                                        className="text-xs bg-muted p-2 rounded"
                                    >
                                        <p className="font-medium">{ev.claim}</p>
                                        <p className="text-muted-foreground">{ev.source}</p>
                                        {ev.dataPoint && (
                                            <p className="text-muted-foreground mt-1">{ev.dataPoint}</p>
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

// 十部分研究报告渲染组件 - 展示完整股票研究分析
export function ResearchReportView({ report, className }: ResearchReportProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['business']));

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

    const moduleRecord = useMemo(() => {
        if ('modules' in report && report.modules) {
            return report.modules as Partial<Record<string, SectionContent>>;
        }
        return report as Partial<Record<string, SectionContent>>;
    }, [report]);

    const availableSections = useMemo(() => {
        return TEN_PART_SECTIONS.filter((s) => {
            const section = moduleRecord[s.key];
            return section && (section.title || section.content || section.keyPoints?.length);
        });
    }, [moduleRecord]);

    if (availableSections.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>正在生成报告...</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {availableSections.map(({ key, label, icon }) => {
                const section = moduleRecord[key];
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
