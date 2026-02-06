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
    type ResearchRole,
    type ReportSection,
} from '../schemas';
import {
    getOrFetchSnapshot,
    extractStockInfo,
    extractLatestFinancials,
    extractRecentNews,
    type FastFinanceResponse,
} from '../services/facts-snapshot-service';

interface ResearchRoleConfig {
    role: ResearchRole;
    name_zh: string;
    description: string;
    sections: ReportSection[];
    requiredData: string[];
}

const RESEARCH_ROLES: ResearchRoleConfig[] = [
    {
        role: 'fundamental_analyst',
        name_zh: '基本面分析师',
        description: '负责公司核心价值与商业模式分析，从整体视角评估公司基本面',
        sections: ['business', 'revenue'],
        requiredData: ['companyInfo', 'incomeStatement', 'news'],
    },
    {
        role: 'financial_analyst',
        name_zh: '财务分析师',
        description: '专注财务报表分析，评估盈利能力、资产质量和现金流健康度',
        sections: ['financial'],
        requiredData: ['incomeStatement', 'balanceSheet', 'cashFlowStatement'],
    },
    {
        role: 'valuation_analyst',
        name_zh: '估值分析师',
        description: '运用多种估值方法评估公司合理价值，计算安全边际',
        sections: ['valuation'],
        requiredData: ['companyInfo', 'incomeStatement', 'marketData'],
    },
    {
        role: 'industry_expert',
        name_zh: '行业专家',
        description: '分析行业竞争格局，评估公司护城河与市场地位',
        sections: ['industry', 'competition'],
        requiredData: ['companyInfo', 'news', 'industryData'],
    },
    {
        role: 'governance_analyst',
        name_zh: '公司治理分析师',
        description: '评估管理层能力、治理结构和股权激励机制',
        sections: ['management'],
        requiredData: ['companyInfo', 'insiderTransactions', 'shareholderStructure'],
    },
    {
        role: 'strategy_analyst',
        name_zh: '战略分析师',
        description: '分析公司战略方向、增长空间和行业发展趋势',
        sections: ['scenario', 'long_thesis'],
        requiredData: ['companyInfo', 'news', 'earningsCall'],
    },
    {
        role: 'risk_analyst',
        name_zh: '风险分析师',
        description: '识别和评估各类风险，包括经营风险、财务风险和行业风险',
        sections: ['risk'],
        requiredData: ['balanceSheet', 'news', 'legalFilings'],
    },
    {
        role: 'data_engineer',
        name_zh: '数据工程师',
        description: '负责数据提取、清洗和预处理，为其他分析师提供数据支持',
        sections: [],
        requiredData: ['all'],
    },
];

export const RESEARCH_ROLE_DEFINITIONS = RESEARCH_ROLES;

export function getRoleConfig(role: ResearchRole): ResearchRoleConfig | undefined {
    return RESEARCH_ROLES.find(r => r.role === role);
}

export function getRolesForSection(section: ReportSection): ResearchRoleConfig[] {
    return RESEARCH_ROLES.filter(r => r.sections.includes(section));
}
export const buildResearchPlanningPrompt = buildPlanningPrompt;
export const buildResearchTaskPrompt = buildResearchPrompt;
export const buildResearchSynthesisPrompt = buildSynthesisPrompt;

function buildPlanningPrompt(
    query: string,
    snapshot: FactsSnapshot,
): string {
    const stockInfo = extractStockInfo(snapshot);

    return `请为以下研究问题制定研究计划（中文输出）：

股票: ${stockInfo.symbol} (${stockInfo.name ?? 'Unknown'})
问题: "${query}"

要求：
1. 拆分为可执行的子问题，适配不同研究角色。
2. 子问题应可由现有数据回答。
3. 输出 ResearchPlanSchema 所需字段。

可用数据包括：财务报表（损益表/资产负债表/现金流）、近期新闻、股本变动、分红、公司信息。`;
}

function buildResearchPrompt(
    task: ResearchTask,
    snapshot: FactsSnapshot,
): string {
    const stockInfo = extractStockInfo(snapshot);
    const financials = extractLatestFinancials(snapshot);
    const news = extractRecentNews(snapshot, 10);
    const data = snapshot.data as FastFinanceResponse;
    
    const roleConfig = getRoleConfig(task.role);
    const roleNameZh = roleConfig?.name_zh ?? task.role;
    const roleDescription = roleConfig?.description ?? '';
    const responsibleSections = roleConfig?.sections ?? [];

    let dataContext = `## 股票: ${stockInfo.symbol} - ${stockInfo.name ?? 'N/A'}
行业: ${stockInfo.sector ?? 'N/A'} | 细分行业: ${stockInfo.industry ?? 'N/A'}
市值: ${stockInfo.marketCap ? `$${(stockInfo.marketCap / 1e9).toFixed(2)}B` : 'N/A'}

## 财务摘要
- 年收入: ${financials.annualRevenue ? `$${(financials.annualRevenue / 1e9).toFixed(2)}B` : 'N/A'}
- 年净利润: ${financials.annualNetIncome ? `$${(financials.annualNetIncome / 1e9).toFixed(2)}B` : 'N/A'}
- 总资产: ${financials.totalAssets ? `$${(financials.totalAssets / 1e9).toFixed(2)}B` : 'N/A'}
- 总负债: ${financials.totalDebt ? `$${(financials.totalDebt / 1e9).toFixed(2)}B` : 'N/A'}
- 自由现金流: ${financials.freeCashFlow ? `$${(financials.freeCashFlow / 1e9).toFixed(2)}B` : 'N/A'}

## 近期新闻
${news.map((n, i) => `${i + 1}. ${n.title ?? '无标题'}`).join('\n')}
`;

    if ((task.role === 'fundamental_analyst' || task.role === 'financial_analyst') && data.AnnualIncomeStatement) {
        const statements = data.AnnualIncomeStatement.slice(0, 3);
        dataContext += `\n## 损益表趋势 (近3年)\n${JSON.stringify(statements, null, 2)}`;
    }

    if ((task.role === 'financial_analyst' || task.role === 'risk_analyst') && data.AnnualBalanceSheet) {
        const balanceSheet = data.AnnualBalanceSheet.slice(0, 2);
        dataContext += `\n## 资产负债表 (近2年)\n${JSON.stringify(balanceSheet, null, 2)}`;
    }

    if (task.role === 'financial_analyst' && data.AnnualCashFlow) {
        const cashFlow = data.AnnualCashFlow.slice(0, 2);
        dataContext += `\n## 现金流量表 (近2年)\n${JSON.stringify(cashFlow, null, 2)}`;
    }

    const sectionsText = responsibleSections.length > 0 
        ? `\n你负责的报告板块: ${responsibleSections.join(', ')}` 
        : '';

    return `你是一位${roleNameZh}。${roleDescription}${sectionsText}

研究问题: "${task.question}"

${dataContext}

请用中文提供详细的研究发现，引用数据中的具体数字和来源作为证据。`;
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

    return `请基于以下研究发现，综合输出结构化研究报告（中文输出）。

原始问题: "${originalQuery}"

研究发现:
${findingsSummary}

要求输出 ResearchReportSchema 结构：
- title
- summary
- modules（包含 business/revenue/industry/competition/financial/risk/management/scenario/valuation/long_thesis）
- limitations
- suggestedFollowUp
- citations（如有）`;
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
                summary: researchReport.summary,
                content: researchReport.summary,
                structuredData: researchReport as Record<string, unknown>,
                sources: {
                    snapshot: snapshot.id,
                    query: input.query,
                    roles: findings.map((f) => f.role),
                },
            })
            .returning();

        const moduleEntries = Object.entries(researchReport.modules ?? {});
        if (moduleEntries.length > 0) {
            await db.insert(reportSections).values(
                moduleEntries.map(([key, section], index) => ({
                    reportId: report.id,
                    sectionName: key,
                    sectionOrder: index + 1,
                    title: section.title ?? key,
                    content: section.content ?? '',
                    structuredData: section as Record<string, unknown>,
                })),
            );
        }

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
