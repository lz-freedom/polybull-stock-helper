import { z } from 'zod';

export const StanceSchema = z.enum(['bullish', 'bearish', 'neutral']);
export type Stance = z.infer<typeof StanceSchema>;

// ============================================================
// 严格枚举定义 (Strict Enum Definitions) - Moved to top for dependency resolution
// ============================================================

/** 研究角色枚举 - 8个专业分析师角色 */
export const ResearchRoleEnum = z.enum([
    'fundamental_analyst',   // 基本面分析师
    'financial_analyst',     // 财务分析师
    'valuation_analyst',     // 估值分析师
    'industry_expert',       // 行业专家
    'governance_analyst',    // 公司治理分析师
    'strategy_analyst',      // 战略分析师
    'risk_analyst',          // 风险分析师
    'data_engineer',         // 数据工程师
]);
export type ResearchRole = z.infer<typeof ResearchRoleEnum>;

/** 优先级枚举 */
export const PriorityEnum = z.enum(['high', 'medium', 'low']);
export type Priority = z.infer<typeof PriorityEnum>;

/** 报告章节枚举 - 10个核心板块 */
export const ReportSectionEnum = z.enum([
    'business',       // 业务
    'revenue',        // 收入
    'industry',       // 行业
    'competition',    // 竞争
    'financial',      // 财务
    'risk',           // 风险
    'management',     // 管理层
    'scenario',       // 情景
    'valuation',      // 估值
    'long_thesis',    // 长期论文
]);
export type ReportSection = z.infer<typeof ReportSectionEnum>;

/** 单维度评分 */
export const DimensionScoreSchema = z.object({
    /** 评分维度名称 */
    dimension: z.string().describe('评分维度，如"盈利能力"、"成长性"'),
    /** 分数 1-10 */
    score: z.number().min(1).max(10).describe('1-10分'),
    /** 评分理由 */
    reasoning: z.string().describe('简要说明评分依据'),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

/** 最终判定 */
export const FinalVerdictSchema = z.object({
    /** 综合评分 1-10 */
    score: z.number().min(1).max(10).describe('综合评分 1-10'),
    /** 投资建议 */
    recommendation: z.enum(['strong_buy', 'buy', 'hold', 'sell', 'strong_sell']).describe('投资建议'),
    /** 置信度 0-100 */
    confidence: z.number().min(0).max(100).describe('结论置信度'),
});
export type FinalVerdict = z.infer<typeof FinalVerdictSchema>;

/** 完整评分模式 */
export const ScoreSchema = z.object({
    /** 多维度评分明细 */
    dimension_details: z.array(DimensionScoreSchema).describe('各维度评分详情'),
    /** 最终判定 */
    final_verdict: FinalVerdictSchema.describe('综合评分与投资建议'),
});
export type Score = z.infer<typeof ScoreSchema>;

// ============================================================
// Core Schemas
// ============================================================

export const ModelAnalysisSchema = z.object({
    modelId: z.string(),
    stance: StanceSchema,
    stanceSummary: z.string().describe('One-liner stance summary in 20 words or less'),
    keyPoints: z.array(z.string()).describe('3-5 key supporting points'),
    risks: z.array(z.string()).describe('2-3 identified risks'),
    confidence: z.number().min(0).max(100).describe('Confidence level 0-100'),
    analysis: z.string().describe('Detailed analysis in markdown format'),
    report: z.lazy(() => TenPartReportSchema).describe('10模块结构化分支报告'),
});

export type ModelAnalysis = z.infer<typeof ModelAnalysisSchema>;

export const ConsensusPointSchema = z.object({
    point: z.string(),
    agreementLevel: z.enum(['unanimous', 'majority', 'split']),
    supportingModels: z.array(z.string()),
});

export type ConsensusPoint = z.infer<typeof ConsensusPointSchema>;

export const DisagreementPointSchema = z.object({
    topic: z.string(),
    positions: z.array(
        z.object({
            stance: StanceSchema,
            models: z.array(z.string()),
            rationale: z.string(),
        }),
    ),
});

export type DisagreementPoint = z.infer<typeof DisagreementPointSchema>;

export const ConsensusReportSchema = z.object({
    title: z.string(),
    overallStance: StanceSchema,
    overallSummary: z.string().describe('Executive summary in 2-3 sentences'),
    consensusPoints: z.array(ConsensusPointSchema),
    disagreementPoints: z.array(DisagreementPointSchema),
    scores: ScoreSchema.describe('Quantitative scoring and recommendation'),
    actionItems: z.array(z.string()).describe('Items requiring further verification'),
    overallConfidence: z.number().min(0).max(100),
    evidenceStrength: z
        .array(z.object({
            claim: z.string(),
            strength: z.enum(['strong', 'medium', 'weak']),
            rationale: z.string(),
        }))
        .optional(),
    riskSignals: z.array(z.string()).optional(),
    wrongSignals: z.array(z.string()).optional(),
});

export type ConsensusReport = z.infer<typeof ConsensusReportSchema>;

export const ResearchTaskSchema = z.object({
    taskId: z.string(),
    question: z.string(),
    role: ResearchRoleEnum,
    priority: PriorityEnum,
});

export type ResearchTask = z.infer<typeof ResearchTaskSchema>;

export const ResearchPlanSchema = z.object({
    mainQuestion: z.string(),
    subQuestions: z.array(ResearchTaskSchema),
    expectedDeliverables: z.array(z.string()),
});

export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

export const EvidenceSchema = z.object({
    claim: z.string(),
    source: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    dataPoint: z.string().optional(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const ResearchFindingSchema = z.object({
    taskId: z.string(),
    role: z.string(),
    summary: z.string(),
    findings: z.array(z.string()),
    evidence: z.array(EvidenceSchema),
    limitations: z.array(z.string()),
});

export type ResearchFinding = z.infer<typeof ResearchFindingSchema>;

export const ResearchReportSchema = z.object({
    title: z.string(),
    summary: z.string(),
    modules: z.record(ReportSectionEnum, z.lazy(() => SectionContentSchema)),
    limitations: z.array(z.string()).optional(),
    suggestedFollowUp: z.array(z.string()).optional(),
    citations: z.array(EvidenceSchema).optional(),
});

export type ResearchReport = z.infer<typeof ResearchReportSchema>;

// ============================================================
// Streamable Report Blocks (Unified)
// ============================================================

export const ReportBlockType = z.enum([
    'toc',
    'markdown',
    'kpi-row',
    'table',
    'chart',
    'callout',
    'score-panel',
    'analyst-panel',
]);

const BlockBase = z.object({
    id: z.string(),
    title: z.string().optional(),
});

export const TocBlockSchema = BlockBase.extend({
    type: z.literal('toc'),
    sections: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            level: z.number().optional(),
            active: z.boolean().optional(),
        }),
    ),
});
export type TocBlock = z.infer<typeof TocBlockSchema>;

export const MarkdownBlockSchema = BlockBase.extend({
    type: z.literal('markdown'),
    content: z.string(),
});
export type MarkdownBlock = z.infer<typeof MarkdownBlockSchema>;

export const KpiItemSchema = z.object({
    label: z.string(),
    value: z.string(),
    change: z.string().optional(),
    trend: z.enum(['up', 'down', 'neutral']).optional(),
    status: z.enum(['success', 'warning', 'error', 'neutral']).optional(),
});
export type KpiItem = z.infer<typeof KpiItemSchema>;

export const KpiRowBlockSchema = BlockBase.extend({
    type: z.literal('kpi-row'),
    items: z.array(KpiItemSchema),
});
export type KpiRowBlock = z.infer<typeof KpiRowBlockSchema>;

export const TableBlockSchema = BlockBase.extend({
    type: z.literal('table'),
    columns: z.array(z.string()),
    rows: z.array(z.record(z.string(), z.string().or(z.number()))),
});
export type TableBlock = z.infer<typeof TableBlockSchema>;

export const ChartBlockSchema = BlockBase.extend({
    type: z.literal('chart'),
    chartType: z.enum(['line', 'bar', 'area', 'composed', 'pie']),
    data: z.array(z.record(z.any())),
    config: z.record(z.object({
        label: z.string().optional(),
        color: z.string().optional(),
    })).optional(),
    xAxisKey: z.string(),
    series: z.array(z.object({
        dataKey: z.string(),
        type: z.enum(['line', 'bar', 'area']).optional(),
        color: z.string().optional(),
        name: z.string().optional(),
        stackId: z.string().optional(),
    })),
});
export type ChartBlock = z.infer<typeof ChartBlockSchema>;

export const CalloutBlockSchema = BlockBase.extend({
    type: z.literal('callout'),
    intent: z.enum(['info', 'warning', 'success', 'danger', 'neutral']),
    content: z.string(),
});
export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

export const ScorePanelBlockSchema = BlockBase.extend({
    type: z.literal('score-panel'),
    score: ScoreSchema,
});
export type ScorePanelBlock = z.infer<typeof ScorePanelBlockSchema>;

export const AnalystPanelBlockSchema = BlockBase.extend({
    type: z.literal('analyst-panel'),
    analysts: z.array(z.object({
        name: z.string(),
        role: ResearchRoleEnum,
        avatar: z.string().optional(),
        analysis: ModelAnalysisSchema.optional(),
    })),
});
export type AnalystPanelBlock = z.infer<typeof AnalystPanelBlockSchema>;

export const ReportBlockSchema = z.discriminatedUnion('type', [
    TocBlockSchema,
    MarkdownBlockSchema,
    KpiRowBlockSchema,
    TableBlockSchema,
    ChartBlockSchema,
    CalloutBlockSchema,
    ScorePanelBlockSchema,
    AnalystPanelBlockSchema,
]);
export type ReportBlock = z.infer<typeof ReportBlockSchema>;

export const StreamableReportSchema = z.object({
    blocks: z.array(ReportBlockSchema),
});
export type StreamableReport = z.infer<typeof StreamableReportSchema>;

// ============================================================
// 10部分报告结构 (Ten-Part Report Structure)
// ============================================================

/** 单个章节内容模式 */
export const SectionContentSchema = z.object({
    /** 章节标题 */
    title: z.string().describe('Section title in Chinese'),
    /** 章节主要内容 */
    content: z.string().describe('Detailed section content in markdown'),
    /** 关键要点 (3-5个) */
    keyPoints: z.array(z.string()).describe('3-5 key bullet points'),
    /** 支撑数据与证据 */
    evidence: z.array(z.object({
        claim: z.string(),
        source: z.string(),
        dataPoint: z.string().optional(),
    })).optional(),
    /** 该板块置信度 0-100 */
    confidence: z.number().min(0).max(100).optional(),
});
export type SectionContent = z.infer<typeof SectionContentSchema>;

/** 10部分完整报告模式 */
export const TenPartReportSchema = z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    business: SectionContentSchema.describe('业务：核心业务与价值主张'),
    revenue: SectionContentSchema.describe('收入：收入结构、驱动因素与质量'),
    industry: SectionContentSchema.describe('行业：行业格局、周期与趋势'),
    competition: SectionContentSchema.describe('竞争：竞争格局、护城河与壁垒'),
    financial: SectionContentSchema.describe('财务：盈利能力、现金流与资产负债'),
    risk: SectionContentSchema.describe('风险：主要风险与潜在负面因素'),
    management: SectionContentSchema.describe('管理层：治理结构、能力与激励'),
    scenario: SectionContentSchema.describe('情景：牛熊情景与关键假设'),
    valuation: SectionContentSchema.describe('估值：估值框架与安全边际'),
    long_thesis: SectionContentSchema.describe('长期论文：长期价值与核心论点'),
});
export type TenPartReport = z.infer<typeof TenPartReportSchema>;
