export const CHAT_MODES = {
    INSTANT: 'instant',
    RIGOROUS: 'rigorous',
    CONSENSUS: 'consensus',
    RESEARCH: 'research',
} as const;

export type ChatMode = (typeof CHAT_MODES)[keyof typeof CHAT_MODES];

export const CHAT_MODE_OPTIONS = [
    {
        id: CHAT_MODES.INSTANT,
        label: '即时问答',
        description: '快速结论与要点',
    },
    {
        id: CHAT_MODES.RIGOROUS,
        label: '严谨分析',
        description: '更深入推理与引用',
    },
    {
        id: CHAT_MODES.CONSENSUS,
        label: '共识分析',
        description: '多模型共识与分歧',
    },
    {
        id: CHAT_MODES.RESEARCH,
        label: '深度研究',
        description: '规划与多轮研究',
    },
] as const;

export const DEFAULT_CHAT_MODE: ChatMode = CHAT_MODES.INSTANT;

export const FOLLOW_UP_ALLOWED_MODES: ChatMode[] = [
    CHAT_MODES.INSTANT,
    CHAT_MODES.RIGOROUS,
];

export const DATA_PART_NAMES = {
    STAGE: 'stage',
    PROGRESS: 'progress',
    THINKING: 'thinking',
    TOOL_CALL: 'tool-call',
    TOOL_RESULT: 'tool-result',
    ARTIFACT: 'artifact',
    DELTA: 'delta',
    DIVERGENCE: 'divergence',
    ERROR: 'error',
    COMPLETE: 'complete',
    ROUND: 'round',
    SOURCES: 'sources',
    BRANCH_STATUS: 'branch-status',
    STEP_SUMMARY: 'step-summary',
    DECISION: 'decision',
    REPORT: 'report',
} as const;

export type DataPartName = (typeof DATA_PART_NAMES)[keyof typeof DATA_PART_NAMES];

export const REPORT_TYPES = {
    CONSENSUS: 'consensus',
    RESEARCH: 'research',
} as const;

export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES];
