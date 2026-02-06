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
        return <Brain className="h-5 w-5 text-info animate-pulse" />;
    }

    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-5 w-5 text-success" />;
        case 'running':
            return <Loader2 className="h-5 w-5 text-info animate-spin" />;
        case 'failed':
            return <XCircle className="h-5 w-5 text-destructive" />;
        case 'skipped':
            return <Circle className="h-5 w-5 text-muted-foreground" />;
        case 'thinking':
            return <Brain className="h-5 w-5 text-info animate-pulse" />;
        default:
            return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
}

// 思考状态显示组件
function ThinkingIndicator({ message }: { message?: string }) {
    if (!message) return null;

    return (
        <div className="mt-2 flex items-start gap-2 p-2 bg-info/10 dark:bg-info/10 rounded-md">
            <Sparkles className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-info dark:text-info italic">
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
            const endpoint = `/api/agents/chat?action=get_run_status&run_id=${runId}&mode=${agentType}`;

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
        const poll = async () => {
            const isDone = await fetchStatus();
            if (isDone) {
                clearInterval(intervalId);
            }
        };

        poll();
        const intervalId: NodeJS.Timeout = setInterval(poll, 2000);

        return () => clearInterval(intervalId);
    }, [fetchStatus]);

    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return (
        <div className={cn('space-y-4', className)}>
            {/* 进度头部 */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                    分析进度
                </span>
                <span className="text-muted-foreground">
                    {completedSteps}/{totalSteps} 步骤
                </span>
            </div>

            {/* 进度条 */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn(
                        'h-full transition-all duration-500',
                        runStatus === 'failed' ? 'bg-destructive/10' : 'bg-info/10',
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* 全局思考状态显示 */}
            {currentThinking && runStatus === 'running' && (
                <div className="flex items-center gap-3 p-3 bg-info/10 dark:bg-info/10 rounded-lg border border-info/30 dark:border-info/30">
                    <Brain className="h-5 w-5 text-info animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-info dark:text-info">
                            思考中...
                        </p>
                        <p className="text-xs text-info dark:text-info truncate">
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
                                    'bg-info/10 dark:bg-info/10',
                                step.status === 'running' && isThinking &&
                                    'bg-info/10 dark:bg-info/10',
                                step.status === 'completed' &&
                                    'bg-success/10 dark:bg-success/10',
                                step.status === 'failed' &&
                                    'bg-destructive/10 dark:bg-destructive/10',
                            )}
                        >
                            <div className="flex-shrink-0 mt-0.5">
                                <StatusIcon status={step.status} isThinking={!!isThinking} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {getStepLabel(step.stepName)}
                                </p>
                                {step.startedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        {step.completedAt
                                            ? `完成耗时 ${Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000)}s`
                                            : '进行中...'}
                                    </p>
                                )}
                                {/* Phase 2: 显示步骤级别的思考消息 */}
                                <ThinkingIndicator message={step.thinkingMessage} />
                            </div>
                            <div className="flex-shrink-0 text-xs text-muted-foreground">
                                步骤 {index + 1}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 错误信息 */}
            {error && (
                <div className="p-3 bg-destructive/10 dark:bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive dark:text-destructive">
                        错误: {error}
                    </p>
                </div>
            )}

            {/* 完成状态 */}
            {runStatus === 'completed' && (
                <div className="p-3 bg-success/10 dark:bg-success/10 rounded-lg">
                    <p className="text-sm text-success dark:text-success font-medium">
                        ✓ 分析完成
                    </p>
                </div>
            )}
        </div>
    );
}
