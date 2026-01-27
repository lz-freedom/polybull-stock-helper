
import { db } from '@/lib/db/drizzle';
import { verificationTokens } from '@/lib/db/schema';

async function main() {
  console.log('Querying verification tokens...');
  const tokens = await db.select().from(verificationTokens);
  console.log('Found tokens:', tokens);
  
  if (tokens.length > 0) {
      console.log('Sample token expires at:', tokens[0].expires);
      console.log('Current time:', new Date());
  }
}

main().catch(console.error).finally(() => process.exit(0));
