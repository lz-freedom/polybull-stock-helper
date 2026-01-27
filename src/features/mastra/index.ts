import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';

import { getModel, MODELS } from './providers/openrouter';
import { qaAgent } from './agents/qa-agent';
import { consensusWorkflow, researchWorkflow } from './workflows';

export const mastra = new Mastra({
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
