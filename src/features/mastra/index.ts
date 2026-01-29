import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';
import { PinoLogger } from '@mastra/loggers';

import { getModel, MODELS } from './providers/openrouter';
import { qaAgent } from './agents/qa-agent';
import { consensusWorkflow, researchWorkflow } from './workflows';

export const mastra = new Mastra({
    storage: new PostgresStore({
        id: 'main-storage',
        connectionString: process.env.POSTGRES_URL!,
    }),
    agents: {
        qaAgent,
    },
    workflows: {
        consensusWorkflow,
        researchWorkflow,
    },
    logger: new PinoLogger({
        name: 'mastra',
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
});

export { getModel, MODELS };
export type { ModelId } from './providers/openrouter';
