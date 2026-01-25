import { NextRequest, NextResponse } from 'next/server';
import {
    createChatSession,
    getChatSession,
    getChatMessages,
    getUserSessions,
    sendMessage,
    refreshSessionData,
    archiveSession,
    updateSessionTitle,
} from '@/features/agents/lib/graphs/qa';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const user = await getUser();
        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'create_session': {
                const { stockSymbol, exchangeAcronym, title } = body;
                const session = await createChatSession({
                    userId: user?.id,
                    stockSymbol,
                    exchangeAcronym,
                    title,
                });
                return NextResponse.json({ success: true, session });
            }

            case 'send_message': {
                const { sessionId, content, referencedReportIds, forceDataRefresh } = body;
                if (!sessionId || !content) {
                    return NextResponse.json(
                        { error: 'sessionId and content are required' },
                        { status: 400 },
                    );
                }

                const result = await sendMessage({
                    sessionId,
                    content,
                    referencedReportIds,
                    forceDataRefresh,
                });

                const encoder = new TextEncoder();
                const stream = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of result.stream) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
                            }
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                        } catch (error) {
                            controller.error(error);
                        }
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                    },
                });
            }

            case 'refresh_data': {
                const { sessionId } = body;
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'sessionId is required' },
                        { status: 400 },
                    );
                }
                const result = await refreshSessionData(sessionId);
                return NextResponse.json({ success: true, ...result });
            }

            case 'archive_session': {
                const { sessionId } = body;
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'sessionId is required' },
                        { status: 400 },
                    );
                }
                await archiveSession(sessionId);
                return NextResponse.json({ success: true });
            }

            case 'update_title': {
                const { sessionId, title } = body;
                if (!sessionId || !title) {
                    return NextResponse.json(
                        { error: 'sessionId and title are required' },
                        { status: 400 },
                    );
                }
                await updateSessionTitle(sessionId, title);
                return NextResponse.json({ success: true });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const user = await getUser();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'get_session': {
                const sessionId = searchParams.get('sessionId');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'sessionId is required' },
                        { status: 400 },
                    );
                }
                const session = await getChatSession(parseInt(sessionId, 10));
                if (!session) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404 },
                    );
                }
                return NextResponse.json({ success: true, session });
            }

            case 'get_messages': {
                const sessionId = searchParams.get('sessionId');
                const limit = searchParams.get('limit');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'sessionId is required' },
                        { status: 400 },
                    );
                }
                const messages = await getChatMessages(
                    parseInt(sessionId, 10),
                    limit ? parseInt(limit, 10) : undefined,
                );
                return NextResponse.json({ success: true, messages });
            }

            case 'get_user_sessions': {
                if (!user) {
                    return NextResponse.json(
                        { error: 'Authentication required' },
                        { status: 401 },
                    );
                }
                const limit = searchParams.get('limit');
                const sessions = await getUserSessions(
                    user.id,
                    limit ? parseInt(limit, 10) : undefined,
                );
                return NextResponse.json({ success: true, sessions });
            }

            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to process request' },
            { status: 500 },
        );
    }
}
