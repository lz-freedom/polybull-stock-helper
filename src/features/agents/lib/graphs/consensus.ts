import { db } from '@/lib/db/drizzle';
import {
    agentRuns,
    agentRunSteps,
    reports,
    reportSections,
    AGENT_TYPES,
    AGENT_RUN_STATUS,
    AGENT_STEP_STATUS,
    type AgentRun,
    type FactsSnapshot,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
    generateStructuredOutput,
    runParallelModels,
    MODELS,
    type ModelId,
} from '../services/llm-client';
import {
    ModelAnalysisSchema,
    ConsensusReportSchema,
    type ModelAnalysis,
    type ConsensusReport,
} from '../schemas';
import {
    getOrFetchSnapshot,
    extractStockInfo,
    extractLatestFinancials,
    extractRecentNews,
} from '../services/facts-snapshot-service';

const ANALYSIS_MODELS: ModelId[] = [MODELS.DEEPSEEK_V3_2, MODELS.QWEN3_MAX];

function buildAnalysisPrompt(snapshot: FactsSnapshot): string {
    const stockInfo = extractStockInfo(snapshot);
    const financials = extractLatestFinancials(snapshot);
    const news = extractRecentNews(snapshot, 5);

    return `分析以下股票数据并提供你的投资观点。请用中文回复。

## 股票信息
- 代码: ${stockInfo.symbol}
- 交易所: ${stockInfo.exchange}
- 名称: ${stockInfo.name ?? 'N/A'}
- 行业: ${stockInfo.sector ?? 'N/A'}
- 细分行业: ${stockInfo.industry ?? 'N/A'}
- 市值: ${stockInfo.marketCap ? `$${(stockInfo.marketCap / 1e9).toFixed(2)}B` : 'N/A'}

## 最新财务数据
- 年收入: ${financials.annualRevenue ? `$${(financials.annualRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- 季度收入: ${financials.quarterlyRevenue ? `$${(financials.quarterlyRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- 年净利润: ${financials.annualNetIncome ? `$${(financials.annualNetIncome / 1e9).toFixed(2)}B` : 'N/A'}
- 总资产: ${financials.totalAssets ? `$${(financials.totalAssets / 1e9).toFixed(2)}B` : 'N/A'}
- 总负债: ${financials.totalDebt ? `$${(financials.totalDebt / 1e9).toFixed(2)}B` : 'N/A'}
- 自由现金流: ${financials.freeCashFlow ? `$${(financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}

## 近期新闻
${news.map((n, i) => `${i + 1}. ${n.title ?? '无标题'} (${n.publisher ?? '未知来源'})`).join('\n')}

请按以下9个板块进行全面分析：

1. **核心概览**: 一句话总结公司核心业务与投资价值
2. **商业模式**: 如何赚钱、收入构成、客户画像
3. **竞争优势**: 护城河分析、市场地位、核心壁垒
4. **财务质量**: 盈利能力、资产负债、现金流健康度
5. **管理层治理**: 管理层背景、公司治理、股权激励
6. **估值分析**: 估值方法、安全边际、同业对比
7. **未来展望**: 成长空间、战略规划、行业趋势
8. **风险提示**: 经营风险、行业风险、财务风险
9. **投资结论**: 综合评价、投资建议、合理估值区间

最后给出你的投资观点(看多/看空/中性)、关键支撑论点、识别的风险和置信度。`;
}

const ANALYSIS_SYSTEM_PROMPT = `你是一位专业的金融分析师。请客观分析提供的股票数据。
综合考虑基本面、近期新闻情绪和市场状况。
分析要具体、数据驱动，避免泛泛而谈。
请用中文回复。`;

function buildSynthesisPrompt(analyses: ModelAnalysis[]): string {
    const analysisTexts = analyses
        .map(
            (a) => `## ${a.modelId} 分析
- 观点: ${a.stance} (置信度: ${a.confidence}%)
- 摘要: ${a.stanceSummary}
- 关键论点: ${a.keyPoints.join('; ')}
- 风险: ${a.risks.join('; ')}`,
        )
        .join('\n\n');

    return `你已收到多个AI模型的分析。请综合这些分析形成共识报告。

${analysisTexts}

请识别：
1. 所有模型一致同意的观点（共识）
2. 模型之间存在分歧的观点（分歧）
3. 需要进一步验证的事项
4. 基于证据权重的整体投资观点

## 评分指南
请对以下维度进行1-10分评分：
- 盈利能力
- 成长性
- 财务健康度
- 估值吸引力
- 竞争优势
- 管理层质量

最后给出综合评分(1-10)和投资建议(强烈买入/买入/持有/卖出/强烈卖出)。`;
}

const SYNTHESIS_SYSTEM_PROMPT = `你是一位高级投资分析师，负责综合多方观点。
识别真正的共识与表面一致。突出有意义的分歧。
保持客观，在存在不确定性的地方明确指出。
请用中文回复。`;

// Export prompt builders/constants for Mastra workflows (no behavior change).
export const CONSENSUS_ANALYSIS_MODELS = ANALYSIS_MODELS;
export const CONSENSUS_ANALYSIS_SYSTEM_PROMPT = ANALYSIS_SYSTEM_PROMPT;
export const CONSENSUS_SYNTHESIS_SYSTEM_PROMPT = SYNTHESIS_SYSTEM_PROMPT;
export const buildConsensusAnalysisPrompt = buildAnalysisPrompt;
export const buildConsensusSynthesisPrompt = buildSynthesisPrompt;

async function updateStepStatus(
    stepId: number,
    status: string,
    output?: unknown,
    error?: string,
) {
    const now = new Date();
    await db
        .update(agentRunSteps)
        .set({
            status,
            output: output as Record<string, unknown> | undefined,
            error,
            ...(status === AGENT_STEP_STATUS.RUNNING ? { startedAt: now } : {}),
            ...(status === AGENT_STEP_STATUS.COMPLETED ||
            status === AGENT_STEP_STATUS.FAILED
                ? { completedAt: now }
                : {}),
        })
        .where(eq(agentRunSteps.id, stepId));
}

async function updateRunStatus(
    runId: number,
    status: string,
    output?: unknown,
    error?: string,
) {
    const now = new Date();
    await db
        .update(agentRuns)
        .set({
            status,
            output: output as Record<string, unknown> | undefined,
            error,
            updatedAt: now,
            ...(status === AGENT_RUN_STATUS.RUNNING ? { startedAt: now } : {}),
            ...(status === AGENT_RUN_STATUS.COMPLETED ||
            status === AGENT_RUN_STATUS.FAILED
                ? { completedAt: now }
                : {}),
        })
        .where(eq(agentRuns.id, runId));
}

export interface ConsensusRunInput {
    stockSymbol: string;
    exchangeAcronym: string;
    userId?: number;
    forceRefresh?: boolean;
}

export interface ConsensusRunResult {
    runId: number;
    report: ConsensusReport;
    modelAnalyses: ModelAnalysis[];
}

export async function runConsensusAgent(
    input: ConsensusRunInput,
): Promise<ConsensusRunResult> {
    const [run] = await db
        .insert(agentRuns)
        .values({
            userId: input.userId,
            agentType: AGENT_TYPES.CONSENSUS,
            status: AGENT_RUN_STATUS.PENDING,
            input: input as unknown as Record<string, unknown>,
        })
        .returning();

    const steps = await db
        .insert(agentRunSteps)
        .values([
            {
                agentRunId: run.id,
                stepName: 'fetch_data',
                stepOrder: 1,
                status: AGENT_STEP_STATUS.PENDING,
            },
            {
                agentRunId: run.id,
                stepName: 'parallel_analysis',
                stepOrder: 2,
                status: AGENT_STEP_STATUS.PENDING,
            },
            {
                agentRunId: run.id,
                stepName: 'synthesize_consensus',
                stepOrder: 3,
                status: AGENT_STEP_STATUS.PENDING,
            },
        ])
        .returning();

    const [fetchStep, analysisStep, synthesisStep] = steps;

    try {
        await updateRunStatus(run.id, AGENT_RUN_STATUS.RUNNING);

        await updateStepStatus(fetchStep.id, AGENT_STEP_STATUS.RUNNING);
        const snapshot = await getOrFetchSnapshot(
            input.stockSymbol,
            input.exchangeAcronym,
            { forceRefresh: input.forceRefresh },
        );

        await db
            .update(agentRuns)
            .set({ factsSnapshotId: snapshot.id })
            .where(eq(agentRuns.id, run.id));

        await updateStepStatus(fetchStep.id, AGENT_STEP_STATUS.COMPLETED, {
            snapshotId: snapshot.id,
        });

        await updateStepStatus(analysisStep.id, AGENT_STEP_STATUS.RUNNING);
        const analysisPrompt = buildAnalysisPrompt(snapshot);

        const modelResults = await runParallelModels(
            ModelAnalysisSchema,
            ANALYSIS_MODELS.map((modelId) => ({
                modelId,
                prompt: analysisPrompt,
                system: ANALYSIS_SYSTEM_PROMPT,
                temperature: 0.7,
            })),
        );

        const validAnalyses = modelResults
            .filter((r) => !r.error && r.result)
            .map((r) => ({ ...r.result, modelId: r.modelId }));

        if (validAnalyses.length === 0) {
            throw new Error('All model analyses failed');
        }

        await updateStepStatus(analysisStep.id, AGENT_STEP_STATUS.COMPLETED, {
            analysisCount: validAnalyses.length,
            models: validAnalyses.map((a) => a.modelId),
        });

        await updateStepStatus(synthesisStep.id, AGENT_STEP_STATUS.RUNNING);
        const synthesisPrompt = buildSynthesisPrompt(validAnalyses);

        const consensusReport = await generateStructuredOutput(
            ConsensusReportSchema,
            synthesisPrompt,
            {
                modelId: MODELS.DEFAULT,
                system: SYNTHESIS_SYSTEM_PROMPT,
                temperature: 0.5,
            },
        );

        await updateStepStatus(
            synthesisStep.id,
            AGENT_STEP_STATUS.COMPLETED,
            consensusReport,
        );

        const stockInfo = extractStockInfo(snapshot);
        const [report] = await db
            .insert(reports)
            .values({
                agentRunId: run.id,
                reportType: 'consensus',
                title: consensusReport.title,
                summary: consensusReport.overallSummary,
                structuredData: consensusReport as Record<string, unknown>,
                sources: { snapshot: snapshot.id, models: ANALYSIS_MODELS },
            })
            .returning();

        await db.insert(reportSections).values(
            validAnalyses.map((analysis, index) => ({
                reportId: report.id,
                sectionName: `model_analysis_${analysis.modelId}`,
                sectionOrder: index + 1,
                modelId: analysis.modelId,
                title: `${analysis.modelId} Analysis`,
                content: analysis.analysis,
                stance: analysis.stance,
                stanceSummary: analysis.stanceSummary,
                structuredData: analysis as Record<string, unknown>,
            })),
        );

        await updateRunStatus(
            run.id,
            AGENT_RUN_STATUS.COMPLETED,
            consensusReport,
        );

        return {
            runId: run.id,
            report: consensusReport,
            modelAnalyses: validAnalyses,
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
        await updateRunStatus(
            run.id,
            AGENT_RUN_STATUS.FAILED,
            undefined,
            errorMessage,
        );
        throw error;
    }
}

export async function getConsensusRunStatus(runId: number): Promise<{
    run: AgentRun;
    steps: Array<{
        stepName: string;
        status: string;
        startedAt: Date | null;
        completedAt: Date | null;
    }>;
}> {
    const [run] = await db
        .select()
        .from(agentRuns)
        .where(eq(agentRuns.id, runId));

    if (!run) {
        throw new Error(`Agent run ${runId} not found`);
    }

    const steps = await db
        .select({
            stepName: agentRunSteps.stepName,
            status: agentRunSteps.status,
            startedAt: agentRunSteps.startedAt,
            completedAt: agentRunSteps.completedAt,
        })
        .from(agentRunSteps)
        .where(eq(agentRunSteps.agentRunId, runId))
        .orderBy(agentRunSteps.stepOrder);

    return { run, steps };
}
