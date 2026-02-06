import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StockPriceCardProps {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency?: string;
    marketCap?: string;
    high?: number;
    low?: number;
}

export function StockPriceCard({
    symbol,
    price,
    change,
    changePercent,
    currency = 'USD',
    marketCap,
    high,
    low,
}: StockPriceCardProps) {
    const isPositive = change >= 0;

    return (
        <Card className="w-full max-w-full border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg font-bold">
                    <span>{symbol}</span>
                    <span className="text-sm font-normal text-muted-foreground">{currency}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex items-baseline gap-3">
                    <span className="text-3xl font-bold">
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className={cn(
                        'flex items-center rounded-full px-2 py-0.5 text-sm font-medium',
                        isPositive
                            ? 'bg-success/10 text-success dark:text-success'
                            : 'bg-destructive/10 text-destructive dark:text-destructive',
                    )}>
                        {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                        <div className="mb-1">市值</div>
                        <div className="font-medium text-foreground">{marketCap || '暂无'}</div>
                    </div>
                    <div>
                        <div className="mb-1">日内区间</div>
                        <div className="font-medium text-foreground">
                            {low ? low.toFixed(2) : '-'} - {high ? high.toFixed(2) : '-'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
