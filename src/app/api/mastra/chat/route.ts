import type { NextRequest } from 'next/server';

import { POST as agentsChatPost } from '@/app/api/agents/chat/route';

export async function POST(request: NextRequest) {
    return agentsChatPost(request);
}
