import type { WorkflowEvent } from '@/features/mastra/events/types';

export const WORKFLOW_EVENT_EMITTER_KEY = 'ivibe__workflowEventEmitter' as const;

export type WorkflowEventEmitter = (event: WorkflowEvent) => Promise<void>;
