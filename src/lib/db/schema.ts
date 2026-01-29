import {
    pgTable,
    serial,
    varchar,
    text,
    timestamp,
    integer,
    primaryKey,
    jsonb,
    boolean,
    index,
    uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// 用户表 - 使用 serial (integer) ID
// ============================================

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: timestamp('email_verified', { mode: 'date' }),
    image: text('image'),
    passwordHash: text('password_hash'), // 可选，用于密码登录
    // 系统角色: super_admin, admin, member
    role: varchar('role', { length: 20 }).notNull().default('member'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

// ============================================
// OAuth 账户表 - 不使用 Drizzle Adapter (我们自己管理)
// ============================================

export const accounts = pgTable('accounts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
});

// 会话表
export const sessions = pgTable('sessions', {
    id: serial('id').primaryKey(),
    sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// 验证令牌表 (用于 Magic Link)
export const verificationTokens = pgTable(
    'verification_tokens',
    {
        identifier: varchar('identifier', { length: 255 }).notNull(),
        token: varchar('token', { length: 255 }).notNull(),
        expires: timestamp('expires', { mode: 'date' }).notNull(),
    },
    (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ============================================
// 业务相关表
// ============================================

export const teams = pgTable('teams', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripeProductId: text('stripe_product_id'),
    planName: varchar('plan_name', { length: 50 }),
    subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
        .notNull()
        .references(() => users.id),
    teamId: integer('team_id')
        .notNull()
        .references(() => teams.id),
    role: varchar('role', { length: 50 }).notNull(), // owner, member
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
        .notNull()
        .references(() => teams.id),
    userId: integer('user_id').references(() => users.id),
    action: text('action').notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
        .notNull()
        .references(() => teams.id),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    invitedBy: integer('invited_by')
        .notNull()
        .references(() => users.id),
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// ============================================
// 关系定义
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    sessions: many(sessions),
    teamMembers: many(teamMembers),
    invitationsSent: many(invitations),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
    teamMembers: many(teamMembers),
    activityLogs: many(activityLogs),
    invitations: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
    team: one(teams, {
        fields: [invitations.teamId],
        references: [teams.id],
    }),
    invitedBy: one(users, {
        fields: [invitations.invitedBy],
        references: [users.id],
    }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
    user: one(users, {
        fields: [teamMembers.userId],
        references: [users.id],
    }),
    team: one(teams, {
        fields: [teamMembers.teamId],
        references: [teams.id],
    }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
    team: one(teams, {
        fields: [activityLogs.teamId],
        references: [teams.id],
    }),
    user: one(users, {
        fields: [activityLogs.userId],
        references: [users.id],
    }),
}));

// ============================================
// 类型导出
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type TeamDataWithMembers = Team & {
    teamMembers: (TeamMember & {
        user: Pick<User, 'id' | 'name' | 'email'>;
    })[];
};

// ============================================
// 活动类型枚举
// ============================================

export enum ActivityType {
    SIGN_UP = 'SIGN_UP',
    SIGN_IN = 'SIGN_IN',
    SIGN_OUT = 'SIGN_OUT',
    UPDATE_PASSWORD = 'UPDATE_PASSWORD',
    DELETE_ACCOUNT = 'DELETE_ACCOUNT',
    UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
    CREATE_TEAM = 'CREATE_TEAM',
    REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
    INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
    ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

// ============================================
// Agent 相关常量
// ============================================

export const AGENT_TYPES = {
    CONSENSUS: 'consensus',
    RESEARCH: 'research',
    QA: 'qa',
} as const;

export type AgentType = (typeof AGENT_TYPES)[keyof typeof AGENT_TYPES];

export const AGENT_RUN_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
} as const;

export type AgentRunStatus =
    (typeof AGENT_RUN_STATUS)[keyof typeof AGENT_RUN_STATUS];

export const AGENT_STEP_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
} as const;

export type AgentStepStatus =
    (typeof AGENT_STEP_STATUS)[keyof typeof AGENT_STEP_STATUS];

// ============================================
// Facts Snapshot - 统一事实底座
// 缓存从 Fast Finance API 获取的股票数据
// ============================================

export const factsSnapshots = pgTable(
    'facts_snapshots',
    {
        id: serial('id').primaryKey(),
        // 股票标识
        stock_symbol: varchar('stock_symbol', { length: 100 }).notNull(),
        exchange_acronym: varchar('exchange_acronym', { length: 100 }).notNull(),
        // 数据内容 (JSON 存储完整 API 响应)
        data: jsonb('data').notNull(),
        // 数据版本/哈希，用于判断是否需要刷新
        dataHash: varchar('data_hash', { length: 64 }),
        // 元数据
        fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
        expiresAt: timestamp('expires_at'), // 可选过期时间
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => [
        index('facts_snapshots_symbol_exchange_idx').on(
            table.stock_symbol,
            table.exchange_acronym,
        ),
        index('facts_snapshots_fetched_at_idx').on(table.fetchedAt),
    ],
);

// ============================================
// Agent Runs - Agent 运行记录
// 记录每次 Agent 调用的整体状态
// ============================================

export const agentRuns = pgTable(
    'agent_runs',
    {
        id: serial('id').primaryKey(),
        // 关联用户 (可选，允许匿名使用)
        userId: integer('user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        // Agent 类型: consensus, research, qa
        agentType: varchar('agent_type', { length: 20 }).notNull(),
        // 运行状态
        status: varchar('status', { length: 20 }).notNull().default('pending'),
        // 输入参数
        input: jsonb('input').notNull(), // { stockSymbol, exchangeAcronym, query?, ... }
        // 输出结果 (完成后填充)
        output: jsonb('output'),
        // 错误信息 (失败时填充)
        error: text('error'),
        // 关联的 facts snapshot
        factsSnapshotId: integer('facts_snapshot_id').references(
            () => factsSnapshots.id,
        ),
        // 时间戳
        startedAt: timestamp('started_at'),
        completedAt: timestamp('completed_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => [
        index('agent_runs_user_id_idx').on(table.userId),
        index('agent_runs_agent_type_idx').on(table.agentType),
        index('agent_runs_status_idx').on(table.status),
        index('agent_runs_created_at_idx').on(table.createdAt),
    ],
);

// ============================================
// Agent Run Steps - Agent 运行步骤
// 记录 Agent 执行的每个步骤 (用于进度展示)
// ============================================

export const agentRunSteps = pgTable(
    'agent_run_steps',
    {
        id: serial('id').primaryKey(),
        agentRunId: integer('agent_run_id')
            .notNull()
            .references(() => agentRuns.id, { onDelete: 'cascade' }),
        // 步骤标识
        stepName: varchar('step_name', { length: 100 }).notNull(),
        stepOrder: integer('step_order').notNull(),
        // 步骤状态
        status: varchar('status', { length: 20 }).notNull().default('pending'),
        // 步骤详情
        input: jsonb('input'),
        output: jsonb('output'),
        error: text('error'),
        // LLM 调用元数据 (token 使用量等)
        metadata: jsonb('metadata'),
        // 时间戳
        startedAt: timestamp('started_at'),
        completedAt: timestamp('completed_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('agent_run_steps_run_id_idx').on(table.agentRunId),
        index('agent_run_steps_status_idx').on(table.status),
    ],
);

// ============================================
// Agent Run Events - Agent 运行事件
// 记录 workflow emit 的所有事件 (NDJSON)
// ============================================

export const agentRunEvents = pgTable(
    'agent_run_events',
    {
        id: serial('id').primaryKey(),
        agentRunId: integer('agent_run_id')
            .notNull()
            .references(() => agentRuns.id, { onDelete: 'cascade' }),
        eventId: varchar('event_id', { length: 64 }).notNull(),
        type: varchar('type', { length: 50 }).notNull(),
        payload: jsonb('payload').notNull(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [index('agent_run_events_run_id_id_idx').on(table.agentRunId, table.id)],
);

// ============================================
// Reports - 共识报告 / 深度研究报告
// ============================================

export const reports = pgTable(
    'reports',
    {
        id: serial('id').primaryKey(),
        // 关联的 Agent 运行
        agentRunId: integer('agent_run_id')
            .notNull()
            .references(() => agentRuns.id, { onDelete: 'cascade' }),
        // 报告类型: consensus, research
        reportType: varchar('report_type', { length: 20 }).notNull(),
        // 报告标题
        title: varchar('title', { length: 500 }),
        // 报告摘要 / one-liner
        summary: text('summary'),
        // 完整报告内容 (Markdown)
        content: text('content'),
        // 结构化数据 (共识/分歧点、置信度等)
        structuredData: jsonb('structured_data'),
        // 引用的数据源
        sources: jsonb('sources'),
        // 时间戳
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => [
        index('reports_agent_run_id_idx').on(table.agentRunId),
        index('reports_report_type_idx').on(table.reportType),
    ],
);

// ============================================
// Report Sections - 报告分节
// 用于共识报告的各模型分项报告
// ============================================

export const reportSections = pgTable(
    'report_sections',
    {
        id: serial('id').primaryKey(),
        reportId: integer('report_id')
            .notNull()
            .references(() => reports.id, { onDelete: 'cascade' }),
        // 分节标识
        sectionName: varchar('section_name', { length: 100 }).notNull(),
        sectionOrder: integer('section_order').notNull(),
        // 模型/角色标识 (共识报告中标识是哪个模型的输出)
        modelId: varchar('model_id', { length: 100 }),
        roleName: varchar('role_name', { length: 100 }),
        // 分节内容
        title: varchar('title', { length: 500 }),
        content: text('content'),
        // one-liner 立场摘要 (共识报告专用)
        stance: varchar('stance', { length: 50 }), // bullish, bearish, neutral
        stanceSummary: text('stance_summary'),
        // 结构化数据
        structuredData: jsonb('structured_data'),
        // 时间戳
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('report_sections_report_id_idx').on(table.reportId),
    ],
);

// ============================================
// Chat Sessions - 即时问答会话
// ============================================

export const chatSessions = pgTable(
    'chat_sessions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        // 关联用户 (可选)
        userId: integer('user_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        // 会话标题 (自动生成或用户设置)
        title: varchar('title', { length: 500 }),
        // 关联的股票 (可选，会话可能涉及多只股票)
        stock_symbol: varchar('stock_symbol', { length: 100 }),
        exchange_acronym: varchar('exchange_acronym', { length: 100 }),
        // 会话元数据
        metadata: jsonb('metadata'),
        // 是否归档
        isArchived: boolean('is_archived').notNull().default(false),
        // 时间戳
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    (table) => [
        index('chat_sessions_user_id_idx').on(table.userId),
        index('chat_sessions_created_at_idx').on(table.createdAt),
    ],
);

// ============================================
// Chat Messages - 即时问答消息
// ============================================

export const chatMessages = pgTable(
    'chat_messages',
    {
        id: serial('id').primaryKey(),
        sessionId: uuid('session_id')
            .notNull()
            .references(() => chatSessions.id, { onDelete: 'cascade' }),
        // 消息角色: user, assistant, system
        role: varchar('role', { length: 20 }).notNull(),
        // 消息内容
        content: text('content').notNull(),
        // 结构化数据 (工具调用结果、引用等)
        metadata: jsonb('metadata'),
        // 关联的 Agent 运行 (如果触发了数据刷新)
        agentRunId: integer('agent_run_id').references(() => agentRuns.id),
        // 引用的报告 IDs
        referencedReportIds: jsonb('referenced_report_ids'), // number[]
        // 时间戳
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        index('chat_messages_session_id_idx').on(table.sessionId),
        index('chat_messages_created_at_idx').on(table.createdAt),
    ],
);

// ============================================
// Agent 相关关系定义
// ============================================

export const factsSnapshotsRelations = relations(
    factsSnapshots,
    ({ many }) => ({
        agentRuns: many(agentRuns),
    }),
);

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
    user: one(users, {
        fields: [agentRuns.userId],
        references: [users.id],
    }),
    factsSnapshot: one(factsSnapshots, {
        fields: [agentRuns.factsSnapshotId],
        references: [factsSnapshots.id],
    }),
    steps: many(agentRunSteps),
    events: many(agentRunEvents),
    reports: many(reports),
    chatMessages: many(chatMessages),
}));

export const agentRunStepsRelations = relations(agentRunSteps, ({ one }) => ({
    agentRun: one(agentRuns, {
        fields: [agentRunSteps.agentRunId],
        references: [agentRuns.id],
    }),
}));

export const agentRunEventsRelations = relations(agentRunEvents, ({ one }) => ({
    agentRun: one(agentRuns, {
        fields: [agentRunEvents.agentRunId],
        references: [agentRuns.id],
    }),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
    agentRun: one(agentRuns, {
        fields: [reports.agentRunId],
        references: [agentRuns.id],
    }),
    sections: many(reportSections),
}));

export const reportSectionsRelations = relations(reportSections, ({ one }) => ({
    report: one(reports, {
        fields: [reportSections.reportId],
        references: [reports.id],
    }),
}));

export const chatSessionsRelations = relations(
    chatSessions,
    ({ one, many }) => ({
        user: one(users, {
            fields: [chatSessions.userId],
            references: [users.id],
        }),
        messages: many(chatMessages),
    }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
    session: one(chatSessions, {
        fields: [chatMessages.sessionId],
        references: [chatSessions.id],
    }),
    agentRun: one(agentRuns, {
        fields: [chatMessages.agentRunId],
        references: [agentRuns.id],
    }),
}));

// ============================================
// Agent 相关类型导出
// ============================================

export type FactsSnapshot = typeof factsSnapshots.$inferSelect;
export type NewFactsSnapshot = typeof factsSnapshots.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type AgentRunStep = typeof agentRunSteps.$inferSelect;
export type NewAgentRunStep = typeof agentRunSteps.$inferInsert;

export type AgentRunEvent = typeof agentRunEvents.$inferSelect;
export type NewAgentRunEvent = typeof agentRunEvents.$inferInsert;

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;

export type ReportSection = typeof reportSections.$inferSelect;
export type NewReportSection = typeof reportSections.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Agent Run with relations
export type AgentRunWithSteps = AgentRun & {
    steps: AgentRunStep[];
};

export type AgentRunWithReport = AgentRun & {
    reports: (Report & {
        sections: ReportSection[];
    })[];
};

export type ChatSessionWithMessages = ChatSession & {
    messages: ChatMessage[];
};
