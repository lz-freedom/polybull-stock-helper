import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ToolFallback: ToolCallMessagePartComponent = ({
    toolName,
    argsText,
    result,
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    return (
        <Card className="mb-4 border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <CheckIcon className="size-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">
                    已调用工具：{toolName}
                </CardTitle>
                <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Button>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <div className="aui-tool-fallback-args-root">
                        <pre className="whitespace-pre-wrap">{argsText}</pre>
                    </div>
                    {result !== undefined && (
                        <div className="aui-tool-fallback-result-root border-t border-dashed border-border pt-2">
                            <p className="font-semibold text-foreground">结果：</p>
                            <pre className="whitespace-pre-wrap">
                                {typeof result === 'string'
                                    ? result
                                    : JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
};
