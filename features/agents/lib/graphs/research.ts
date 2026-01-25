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
import { generateStructuredOutput, MODELS } from '../services/llm-client';
import {
    ResearchPlanSchema,
    ResearchFindingSchema,
    ResearchReportSchema,
    type ResearchPlan,
    type ResearchFinding,
    type ResearchReport,
    type ResearchTask,
} from '../schemas';
import {
    getOrFetchSnapshot,
    extractStockInfo,
    extractLatestFinancials,
    extractRecentNews,
    type FastFinanceResponse,
} from '../services/facts-snapshot-service';

const RESEARCH_ROLES = [
    {
        role: 'fundamental_analyst',
        description: 'Focus on financial statements, ratios, and valuation metrics',
    },
    {
        role: 'technical_analyst',
        description: 'Focus on price patterns, momentum, and market trends',
    },
    {
        role: 'industry_expert',
        description: 'Focus on competitive positioning and industry dynamics',
    },
    {
        role: 'risk_analyst',
        description: 'Focus on risks, threats, and downside scenarios',
    },
];

function buildPlanningPrompt(
    query: string,
    snapshot: FactsSnapshot,
): string {
    const stockInfo = extractStockInfo(snapshot);

    return `Create a research plan to answer the following question about ${stockInfo.symbol} (${stockInfo.name ?? 'Unknown'}):

"${query}"

Break this down into specific sub-questions that different research roles can investigate.
Each sub-question should be answerable with the available financial data.

Available data includes: financial statements (income, balance sheet, cash flow), recent news, stock splits, dividends, and company info.`;
}

function buildResearchPrompt(
    task: ResearchTask,
    snapshot: FactsSnapshot,
): string {
    const stockInfo = extractStockInfo(snapshot);
    const financials = extractLatestFinancials(snapshot);
    const news = extractRecentNews(snapshot, 10);
    const data = snapshot.data as FastFinanceResponse;

    let dataContext = `## Stock: ${stockInfo.symbol} - ${stockInfo.name ?? 'N/A'}
Sector: ${stockInfo.sector ?? 'N/A'} | Industry: ${stockInfo.industry ?? 'N/A'}
Market Cap: ${stockInfo.marketCap ? `$${(stockInfo.marketCap / 1e9).toFixed(2)}B` : 'N/A'}

## Financial Highlights
- Annual Revenue: ${financials.annualRevenue ? `$${(financials.annualRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- Net Income: ${financials.annualNetIncome ? `$${(financials.annualNetIncome / 1e9).toFixed(2)}B` : 'N/A'}
- Total Assets: ${financials.totalAssets ? `$${(financials.totalAssets / 1e9).toFixed(2)}B` : 'N/A'}
- Total Debt: ${financials.totalDebt ? `$${(financials.totalDebt / 1e9).toFixed(2)}B` : 'N/A'}
- Free Cash Flow: ${financials.freeCashFlow ? `$${(financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}

## Recent News
${news.map((n, i) => `${i + 1}. ${n.title ?? 'No title'}`).join('\n')}
`;

    if (task.role === 'fundamental_analyst' && data.AnnualIncomeStatement) {
        const statements = data.AnnualIncomeStatement.slice(0, 3);
        dataContext += `\n## Income Statement Trends (Last 3 Years)\n${JSON.stringify(statements, null, 2)}`;
    }

    if (task.role === 'risk_analyst' && data.AnnualBalanceSheet) {
        const balanceSheet = data.AnnualBalanceSheet.slice(0, 2);
        dataContext += `\n## Balance Sheet (Last 2 Years)\n${JSON.stringify(balanceSheet, null, 2)}`;
    }

    return `You are a ${task.role.replace('_', ' ')}. ${RESEARCH_ROLES.find((r) => r.role === task.role)?.description ?? ''}

Research Question: "${task.question}"

${dataContext}

Provide detailed findings with specific evidence from the data. Cite numbers and sources.`;
}

function buildSynthesisPrompt(
    originalQuery: string,
    plan: ResearchPlan,
    findings: ResearchFinding[],
): string {
    const findingsSummary = findings
        .map(
            (f) => `## ${f.role} Findings
Summary: ${f.summary}
Key Points:
${f.findings.map((p) => `- ${p}`).join('\n')}
Evidence:
${f.evidence.map((e) => `- ${e.claim} (Source: ${e.source}, Confidence: ${e.confidence})`).join('\n')}
Limitations: ${f.limitations.join('; ')}`,
        )
        .join('\n\n');

    return `Synthesize the following research findings into a comprehensive report.

Original Question: "${originalQuery}"

Research Findings:
${findingsSummary}

Create a well-structured report with:
1. Executive summary answering the original question
2. Detailed sections covering each aspect
3. Evidence citations for key claims
4. Limitations and caveats
5. Suggested follow-up questions`;
}

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

export interface ResearchRunInput {
    stockSymbol: string;
    exchangeAcronym: string;
    query: string;
    userId?: number;
    forceRefresh?: boolean;
}

export interface ResearchRunResult {
    runId: number;
    report: ResearchReport;
    plan: ResearchPlan;
    findings: ResearchFinding[];
}

export async function runResearchAgent(
    input: ResearchRunInput,
): Promise<ResearchRunResult> {
    const [run] = await db
        .insert(agentRuns)
        .values({
            userId: input.userId,
            agentType: AGENT_TYPES.RESEARCH,
            status: AGENT_RUN_STATUS.PENDING,
            input: input as unknown as Record<string, unknown>,
        })
        .returning();

    const initialSteps = await db
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
                stepName: 'create_plan',
                stepOrder: 2,
                status: AGENT_STEP_STATUS.PENDING,
            },
        ])
        .returning();

    const [fetchStep, planStep] = initialSteps;

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

        await updateStepStatus(planStep.id, AGENT_STEP_STATUS.RUNNING);
        const planningPrompt = buildPlanningPrompt(input.query, snapshot);

        const plan = await generateStructuredOutput(
            ResearchPlanSchema,
            planningPrompt,
            {
                modelId: MODELS.DEFAULT,
                system: 'You are a research planner. Create focused, answerable research tasks.',
                temperature: 0.5,
            },
        );

        await updateStepStatus(planStep.id, AGENT_STEP_STATUS.COMPLETED, plan);

        const researchSteps = await db
            .insert(agentRunSteps)
            .values(
                plan.subQuestions.map((task, index) => ({
                    agentRunId: run.id,
                    stepName: `research_${task.role}`,
                    stepOrder: 3 + index,
                    status: AGENT_STEP_STATUS.PENDING,
                    input: task as Record<string, unknown>,
                })),
            )
            .returning();

        const findings: ResearchFinding[] = [];

        for (let i = 0; i < plan.subQuestions.length; i++) {
            const task = plan.subQuestions[i];
            const step = researchSteps[i];

            await updateStepStatus(step.id, AGENT_STEP_STATUS.RUNNING);

            try {
                const researchPrompt = buildResearchPrompt(task, snapshot);

                const finding = await generateStructuredOutput(
                    ResearchFindingSchema,
                    researchPrompt,
                    {
                        modelId: MODELS.DEFAULT,
                        temperature: 0.7,
                    },
                );

                findings.push(finding);
                await updateStepStatus(
                    step.id,
                    AGENT_STEP_STATUS.COMPLETED,
                    finding,
                );
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : 'Unknown error';
                await updateStepStatus(
                    step.id,
                    AGENT_STEP_STATUS.FAILED,
                    undefined,
                    errorMessage,
                );
            }
        }

        if (findings.length === 0) {
            throw new Error('All research tasks failed');
        }

        const [synthesisStep] = await db
            .insert(agentRunSteps)
            .values({
                agentRunId: run.id,
                stepName: 'synthesize_report',
                stepOrder: 3 + plan.subQuestions.length,
                status: AGENT_STEP_STATUS.PENDING,
            })
            .returning();

        await updateStepStatus(synthesisStep.id, AGENT_STEP_STATUS.RUNNING);
        const synthesisPrompt = buildSynthesisPrompt(
            input.query,
            plan,
            findings,
        );

        const researchReport = await generateStructuredOutput(
            ResearchReportSchema,
            synthesisPrompt,
            {
                modelId: MODELS.DEFAULT,
                system: 'You are a senior research analyst. Create comprehensive, well-structured reports.',
                temperature: 0.5,
            },
        );

        await updateStepStatus(
            synthesisStep.id,
            AGENT_STEP_STATUS.COMPLETED,
            researchReport,
        );

        const [report] = await db
            .insert(reports)
            .values({
                agentRunId: run.id,
                reportType: 'research',
                title: researchReport.title,
                summary: researchReport.executiveSummary,
                content: researchReport.conclusion,
                structuredData: researchReport as Record<string, unknown>,
                sources: {
                    snapshot: snapshot.id,
                    query: input.query,
                    roles: findings.map((f) => f.role),
                },
            })
            .returning();

        await db.insert(reportSections).values(
            researchReport.sections.map((section, index) => ({
                reportId: report.id,
                sectionName: `section_${index + 1}`,
                sectionOrder: index + 1,
                title: section.heading,
                content: section.content,
                structuredData: {
                    evidence: section.evidence,
                } as Record<string, unknown>,
            })),
        );

        await updateRunStatus(
            run.id,
            AGENT_RUN_STATUS.COMPLETED,
            researchReport,
        );

        return {
            runId: run.id,
            report: researchReport,
            plan,
            findings,
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

export async function getResearchRunStatus(runId: number): Promise<{
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
