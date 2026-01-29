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
                const { session_id, stock_symbol, exchange_acronym, title } = body;
                const session = await createChatSession({
                    id: session_id,
                    userId: user?.id,
                    stockSymbol: stock_symbol,
                    exchangeAcronym: exchange_acronym,
                    title,
                });
                return NextResponse.json({ success: true, session });
            }

            case 'send_message': {
                const { session_id, content, referenced_report_ids, force_data_refresh } = body;
                if (!session_id || !content) {
                    return NextResponse.json(
                        { error: 'session_id and content are required' },
                        { status: 400 },
                    );
                }

                const result = await sendMessage({
                    sessionId: session_id,
                    content,
                    userId: user?.id,
                    referencedReportIds: referenced_report_ids,
                    forceDataRefresh: force_data_refresh,
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
                const { session_id } = body;
                if (!session_id) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                const result = await refreshSessionData(session_id);
                return NextResponse.json({ success: true, ...result });
            }

            case 'archive_session': {
                const { session_id } = body;
                if (!session_id) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                await archiveSession(session_id);
                return NextResponse.json({ success: true });
            }

            case 'update_title': {
                const { session_id, title } = body;
                if (!session_id || !title) {
                    return NextResponse.json(
                        { error: 'session_id and title are required' },
                        { status: 400 },
                    );
                }
                await updateSessionTitle(session_id, title);
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
                const sessionId = searchParams.get('session_id');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                const session = await getChatSession(sessionId);
                if (!session) {
                    return NextResponse.json(
                        { error: 'Session not found' },
                        { status: 404 },
                    );
                }
                return NextResponse.json({ success: true, session });
            }

            case 'get_messages': {
                const sessionId = searchParams.get('session_id');
                const limit = searchParams.get('limit');
                if (!sessionId) {
                    return NextResponse.json(
                        { error: 'session_id is required' },
                        { status: 400 },
                    );
                }
                const messages = await getChatMessages(
                    sessionId,
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
