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
        <Card className="w-full max-w-sm bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex justify-between items-center">
                    <span>{symbol}</span>
                    <span className="text-sm font-normal text-muted-foreground">{currency}</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold">
                        {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className={cn(
                        "flex items-center text-sm font-medium px-2 py-0.5 rounded",
                        isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {isPositive ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {Math.abs(change).toFixed(2)} ({Math.abs(changePercent).toFixed(2)}%)
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                        <div className="mb-1">Market Cap</div>
                        <div className="font-medium text-foreground">{marketCap || 'N/A'}</div>
                    </div>
                    <div>
                        <div className="mb-1">Day Range</div>
                        <div className="font-medium text-foreground">
                            {low ? low.toFixed(2) : '-'} - {high ? high.toFixed(2) : '-'}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
