'use client';

// ============================================================
// AgentRunTimeline - Agent 运行时间线组件
// 显示 Agent 运行的步骤进度和状态
// Phase 2 增强: 支持 thinking 事件显示
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Loader2, XCircle, Clock, Brain, Sparkles } from 'lucide-react';

// 步骤数据结构
interface Step {
    stepName: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    // Phase 2: thinking 事件支持
    thinkingMessage?: string;
}

// 组件属性
interface AgentRunTimelineProps {
    runId: number;
    agentType: 'consensus' | 'research' | 'qa';
    onComplete?: () => void;
    className?: string;
}

// 步骤标签映射 (英文 -> 中文)
const STEP_LABELS: Record<string, string> = {
    fetch_data: '获取股票数据',
    parallel_analysis: '运行模型分析',
    synthesize_consensus: '综合共识意见',
    create_plan: '创建研究计划',
    synthesize_report: '生成最终报告',
    research_fundamental_analyst: '基本面分析',
    research_technical_analyst: '技术面分析',
    research_industry_expert: '行业分析',
    research_risk_analyst: '风险分析',
    thinking: '思考中...',
};

function getStepLabel(stepName: string): string {
    return STEP_LABELS[stepName] ?? stepName.replace(/_/g, ' ');
}

// 状态图标组件
function StatusIcon({ status, isThinking }: { status: string; isThinking?: boolean }) {
    if (isThinking) {
        return <Brain className="h-5 w-5 text-purple-500 animate-pulse" />;
    }

    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        case 'running':
            return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
        case 'failed':
            return <XCircle className="h-5 w-5 text-red-500" />;
        case 'skipped':
            return <Circle className="h-5 w-5 text-gray-400" />;
        case 'thinking':
            return <Brain className="h-5 w-5 text-purple-500 animate-pulse" />;
        default:
            return <Clock className="h-5 w-5 text-gray-300" />;
    }
}

// 思考状态显示组件
function ThinkingIndicator({ message }: { message?: string }) {
    if (!message) return null;

    return (
        <div className="mt-2 flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
            <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-700 dark:text-purple-300 italic">
                {message}
            </p>
        </div>
    );
}

export function AgentRunTimeline({
    runId,
    agentType,
    onComplete,
    className,
}: AgentRunTimelineProps) {
    const [steps, setSteps] = useState<Step[]>([]);
    const [runStatus, setRunStatus] = useState<string>('pending');
    const [error, setError] = useState<string | null>(null);
    // Phase 2: 当前思考状态
    const [currentThinking, setCurrentThinking] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const endpoint =
                agentType === 'research'
                    ? `/api/agents/research?runId=${runId}`
                    : `/api/agents/consensus?runId=${runId}`;

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.success) {
                setSteps(data.steps);
                setRunStatus(data.run.status);

                // Phase 2: 处理 thinking 事件
                if (data.thinking) {
                    setCurrentThinking(data.thinking.message || '分析中...');
                } else {
                    setCurrentThinking(null);
                }

                // 更新步骤中的 thinking 消息
                if (data.steps) {
                    const updatedSteps = data.steps.map((step: Step) => ({
                        ...step,
                        thinkingMessage: step.status === 'running' ? data.thinking?.message : undefined,
                    }));
                    setSteps(updatedSteps);
                }

                if (
                    data.run.status === 'completed' ||
                    data.run.status === 'failed'
                ) {
                    setCurrentThinking(null);
                    if (data.run.status === 'completed') {
                        onComplete?.();
                    }
                    if (data.run.status === 'failed' && data.run.error) {
                        setError(data.run.error);
                    }
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Failed to fetch run status:', err);
            return false;
        }
    }, [runId, agentType, onComplete]);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const poll = async () => {
            const isDone = await fetchStatus();
            if (isDone) {
                clearInterval(intervalId);
            }
        };

        poll();
        intervalId = setInterval(poll, 2000);

        return () => clearInterval(intervalId);
    }, [fetchStatus]);

    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return (
        <div className={cn('space-y-4', className)}>
            {/* 进度头部 */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                    分析进度
                </span>
                <span className="text-gray-500">
                    {completedSteps}/{totalSteps} 步骤
                </span>
            </div>

            {/* 进度条 */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all duration-500',
                        runStatus === 'failed' ? 'bg-red-500' : 'bg-blue-500',
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* 全局思考状态显示 */}
            {currentThinking && runStatus === 'running' && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <Brain className="h-5 w-5 text-purple-500 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            思考中...
                        </p>
                        <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
                            {currentThinking}
                        </p>
                    </div>
                </div>
            )}

            {/* 步骤列表 */}
            <div className="space-y-3">
                {steps.map((step, index) => {
                    const isThinking = step.status === 'running' && step.thinkingMessage;
                    
                    return (
                        <div
                            key={step.stepName}
                            className={cn(
                                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                                step.status === 'running' && !isThinking &&
                                    'bg-blue-50 dark:bg-blue-900/20',
                                step.status === 'running' && isThinking &&
                                    'bg-purple-50 dark:bg-purple-900/20',
                                step.status === 'completed' &&
                                    'bg-green-50 dark:bg-green-900/20',
                                step.status === 'failed' &&
                                    'bg-red-50 dark:bg-red-900/20',
                            )}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                <StatusIcon status={step.status} isThinking={!!isThinking} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {getStepLabel(step.stepName)}
                                </p>
                                {step.startedAt && (
                                    <p className="text-xs text-gray-500">
                                        {step.completedAt
                                            ? `完成耗时 ${Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s`
                                            : '进行中...'}
                                    </p>
                                )}
                                {/* Phase 2: 显示步骤级别的思考消息 */}
                                <ThinkingIndicator message={step.thinkingMessage} />
                            </div>
                            <div className="flex-shrink-0 text-xs text-gray-400">
                                步骤 {index + 1}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 错误信息 */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                        错误: {error}
                    </p>
                </div>
            )}

            {/* 完成状态 */}
            {runStatus === 'completed' && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                        ✓ 分析完成
                    </p>
                </div>
            )}
        </div>
    );
}
