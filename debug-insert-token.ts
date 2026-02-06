
import { db } from '@/lib/db/drizzle';
import { verificationTokens } from '@/lib/db/schema';

async function main() {
    console.log('Attempting to insert a test token...');
    try {
        const now = new Date();
        const expires = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour
      
        const result = await db.insert(verificationTokens).values({
            identifier: 'test@example.com',
            token: 'test-token-' + Date.now(),
            expires: expires,
        }).returning();
      
        console.log('Insert success:', result);
    } catch (e) {
        console.error('Insert failed:', e);
    }
}

main().catch(console.error).finally(() => process.exit(0));
