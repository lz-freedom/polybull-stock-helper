import { PostgresStore } from '@mastra/pg';

export const storage = new PostgresStore({
    id: 'main-storage',
    connectionString: process.env.POSTGRES_URL!,
});
