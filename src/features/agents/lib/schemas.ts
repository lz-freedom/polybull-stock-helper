import { z } from 'zod';

export const StanceSchema = z.enum(['bullish', 'bearish', 'neutral']);
export type Stance = z.infer<typeof StanceSchema>;

export const ModelAnalysisSchema = z.object({
    modelId: z.string(),
    stance: StanceSchema,
    stanceSummary: z.string().describe('One-liner stance summary in 20 words or less'),
    keyPoints: z.array(z.string()).describe('3-5 key supporting points'),
    risks: z.array(z.string()).describe('2-3 identified risks'),
    confidence: z.number().min(0).max(100).describe('Confidence level 0-100'),
    analysis: z.string().describe('Detailed analysis in markdown format'),
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
    actionItems: z.array(z.string()).describe('Items requiring further verification'),
    overallConfidence: z.number().min(0).max(100),
});

export type ConsensusReport = z.infer<typeof ConsensusReportSchema>;

export const ResearchTaskSchema = z.object({
    taskId: z.string(),
    question: z.string(),
    role: z.string().describe('The researcher role/perspective'),
    priority: z.enum(['high', 'medium', 'low']),
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
    executiveSummary: z.string(),
    sections: z.array(
        z.object({
            heading: z.string(),
            content: z.string(),
            evidence: z.array(EvidenceSchema),
        }),
    ),
    conclusion: z.string(),
    limitations: z.array(z.string()),
    suggestedFollowUp: z.array(z.string()),
});

export type ResearchReport = z.infer<typeof ResearchReportSchema>;
