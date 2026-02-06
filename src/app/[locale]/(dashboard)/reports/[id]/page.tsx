export const dynamic = 'force-dynamic';

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { eq, and, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';

import { db } from '@/lib/db/drizzle';
import { agentRuns, reports, reportSections } from '@/lib/db/schema';
import { ReportViewer } from '@features/agents/components/report-viewer';
import type { TenPartReport, ConsensusReport } from '@features/agents/lib/schemas';

// ============================================================
// 报告详情页 - 支持流式渲染和静态展示
// Route: /[locale]/reports/[id]
// ============================================================

interface ReportPageProps {
    params: Promise<{ locale: string; id: string }>;
}

/**
 * 根据 agentRunId 获取报告数据
 * 包含 agentRun、report 及其 sections
 */
async function getReportData(runId: number) {
    // 获取 agent run 记录
    const [run] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, runId))
        .limit(1);

    if (!run) {
        return null;
    }

    // 获取关联的报告 (可能是 consensus 或 research 类型)
    const [report] = await db
        .select()
        .from(reports)
        .where(eq(reports.agentRunId, runId))
        .limit(1);

    // 如果有报告，获取其 sections
    const sections = report
        ? await db
            .select()
            .from(reportSections)
            .where(eq(reportSections.reportId, report.id))
            .orderBy(asc(reportSections.sectionOrder))
        : [];

    return {
        run,
        report: report ? { ...report, sections } : null,
    };
}

export default async function ReportPage({ params }: ReportPageProps) {
    const { locale, id } = await params;
    setRequestLocale(locale);

    // 解析 runId
    const runId = Number(id);
    if (!Number.isInteger(runId) || runId <= 0) {
        notFound();
    }

    // 获取报告数据
    const data = await getReportData(runId);
    if (!data) {
        notFound();
    }

    const { run, report } = data;

    // 确定 agent 类型 (consensus / research)
    const agentType = run.agentType as 'consensus' | 'research' | 'qa';

    // structuredData 是 jsonb，需要类型断言
    const initialReport = (report?.structuredData as TenPartReport | ConsensusReport | null) ?? null;

    // 判断是否正在运行中 (需要流式展示)
    const isRunning = run.status === 'running' || run.status === 'pending';

    return (
        <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto">
                {/* 报告查看器 - 支持流式和静态模式 */}
                <ReportViewer
                    agentRunId={runId}
                    agentType={agentType}
                    initialReport={initialReport}
                    initialStatus={run.status}
                    reportTitle={report?.title ?? undefined}
                    reportSummary={report?.summary ?? undefined}
                    isStreaming={isRunning}
                    locale={locale}
                />
            </div>
        </div>
    );
}
