import { AnalystPanelBlock } from '@/features/agents/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AnalystPanelBlockProps {
    block: AnalystPanelBlock;
}

export function AnalystPanelBlockComponent({ block }: AnalystPanelBlockProps) {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-xl">{block.title || 'Analyst Team'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {block.analysts.map((analyst, index) => (
                        <Card key={`${analyst.name}-${index}`} className="overflow-hidden border bg-card text-card-foreground shadow-sm">
                            <div className="p-4 flex items-center gap-4 border-b bg-muted/30">
                                <Avatar className="h-12 w-12 border-2 border-background">
                                    <AvatarImage src={analyst.avatar} alt={analyst.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {analyst.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold truncate">{analyst.name}</div>
                                    <Badge variant="outline" className="text-xs font-normal mt-1">
                                        {analyst.role.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
              
                            {analyst.analysis && (
                                <div className="p-4 text-sm space-y-3">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className={cn(
                                            'font-medium uppercase px-1.5 py-0.5 rounded',
                                            analyst.analysis.stance === 'bullish' ? 'bg-success/10 text-success dark:bg-success/10 dark:text-success' :
                                                analyst.analysis.stance === 'bearish' ? 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive' :
                                                    'bg-muted text-muted-foreground',
                                        )}>
                                            {analyst.analysis.stance}
                                        </span>
                                        <span>Conf: {analyst.analysis.confidence}%</span>
                                    </div>
                                    <p className="line-clamp-3 text-muted-foreground">
                                        {analyst.analysis.stanceSummary}
                                    </p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
