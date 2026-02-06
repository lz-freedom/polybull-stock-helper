'use client';

import { StreamableReport } from '@/features/agents/lib/schemas';
import { TocBlockComponent } from './blocks/toc-block';
import { MarkdownBlockComponent } from './blocks/markdown-block';
import { KpiRowBlockComponent } from './blocks/kpi-row-block';
import { TableBlockComponent } from './blocks/table-block';
import { ChartBlockComponent } from './blocks/chart-block';
import { CalloutBlockComponent } from './blocks/callout-block';
import { ScorePanelBlockComponent } from './blocks/score-panel-block';
import { AnalystPanelBlockComponent } from './blocks/analyst-panel-block';

interface StreamableReportViewProps {
    report: StreamableReport;
}

export function StreamableReportView({ report }: StreamableReportViewProps) {
    if (!report.blocks || report.blocks.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Waiting for report content...
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            {report.blocks.map((block) => {
                const key = block.id;

                switch (block.type) {
                    case 'toc':
                        return <TocBlockComponent key={key} block={block} />;
                    case 'markdown':
                        return <MarkdownBlockComponent key={key} block={block} />;
                    case 'kpi-row':
                        return <KpiRowBlockComponent key={key} block={block} />;
                    case 'table':
                        return <TableBlockComponent key={key} block={block} />;
                    case 'chart':
                        return <ChartBlockComponent key={key} block={block} />;
                    case 'callout':
                        return <CalloutBlockComponent key={key} block={block} />;
                    case 'score-panel':
                        return <ScorePanelBlockComponent key={key} block={block} />;
                    case 'analyst-panel':
                        return <AnalystPanelBlockComponent key={key} block={block} />;
                    default:
                        return (
                            <div key={key} className="p-4 border border-dashed rounded text-muted-foreground">
                                Unknown block type: {(block as any).type}
                            </div>
                        );
                }
            })}
        </div>
    );
}
