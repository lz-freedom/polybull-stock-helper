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

    return `Analyze the following stock data and provide your investment stance.

## Stock Information
- Symbol: ${stockInfo.symbol}
- Exchange: ${stockInfo.exchange}
- Name: ${stockInfo.name ?? 'N/A'}
- Sector: ${stockInfo.sector ?? 'N/A'}
- Industry: ${stockInfo.industry ?? 'N/A'}
- Market Cap: ${stockInfo.marketCap ? `$${(stockInfo.marketCap / 1e9).toFixed(2)}B` : 'N/A'}

## Latest Financials
- Annual Revenue: ${financials.annualRevenue ? `$${(financials.annualRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- Quarterly Revenue: ${financials.quarterlyRevenue ? `$${(financials.quarterlyRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- Annual Net Income: ${financials.annualNetIncome ? `$${(financials.annualNetIncome / 1e9).toFixed(2)}B` : 'N/A'}
- Total Assets: ${financials.totalAssets ? `$${(financials.totalAssets / 1e9).toFixed(2)}B` : 'N/A'}
- Total Debt: ${financials.totalDebt ? `$${(financials.totalDebt / 1e9).toFixed(2)}B` : 'N/A'}
- Free Cash Flow: ${financials.freeCashFlow ? `$${(financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}

## Recent News Headlines
${news.map((n, i) => `${i + 1}. ${n.title ?? 'No title'} (${n.publisher ?? 'Unknown'})`).join('\n')}

Provide a comprehensive analysis with your investment stance (bullish/bearish/neutral), key supporting points, identified risks, and confidence level.`;
}

const ANALYSIS_SYSTEM_PROMPT = `You are a professional financial analyst. Analyze the provided stock data objectively.
Consider fundamentals, recent news sentiment, and market conditions.
Be specific and data-driven in your analysis. Avoid generic statements.`;

function buildSynthesisPrompt(analyses: ModelAnalysis[]): string {
    const analysisTexts = analyses
        .map(
            (a) => `## ${a.modelId} Analysis
- Stance: ${a.stance} (Confidence: ${a.confidence}%)
- Summary: ${a.stanceSummary}
- Key Points: ${a.keyPoints.join('; ')}
- Risks: ${a.risks.join('; ')}`,
        )
        .join('\n\n');

    return `You have received analyses from multiple AI models. Synthesize them into a consensus report.

${analysisTexts}

Identify:
1. Points where all models agree (consensus)
2. Points where models disagree (divergence)
3. Action items that need further verification
4. Overall stance based on the weight of evidence`;
}

const SYNTHESIS_SYSTEM_PROMPT = `You are a senior investment analyst synthesizing multiple perspectives.
Identify genuine consensus vs apparent agreement. Highlight meaningful disagreements.
Be objective and highlight uncertainty where it exists.`;

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
