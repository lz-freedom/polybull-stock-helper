import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';

import { getModel, MODELS } from './providers/openrouter';
import { instantAgent } from './agents/instant-agent';
import { instantLiteAgent } from './agents/instant-lite-agent';
import { rigorousAgent } from './agents/rigorous-agent';
import { rigorousLiteAgent } from './agents/rigorous-lite-agent';
import { consensusWorkflow, researchWorkflow } from './workflows';
import { storage } from './storage';

export const mastra = new Mastra({
    storage,
    agents: {
        instantAgent,
        rigorousAgent,
        instantLiteAgent,
        rigorousLiteAgent,
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
