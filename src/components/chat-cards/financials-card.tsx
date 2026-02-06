import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export interface FinancialMetric {
    label: string;
    value: string | number;
    period?: string;
}

interface FinancialsCardProps {
    symbol: string;
    metrics: FinancialMetric[];
}

export function FinancialsCard({ symbol, metrics }: FinancialsCardProps) {
    return (
        <Card className="w-full max-w-full border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    关键财务数据 · {symbol}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {metrics.map((metric, i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                                <TableCell className="py-2 text-xs font-medium text-muted-foreground">
                                    {metric.label}
                                </TableCell>
                                <TableCell className="py-2 text-right font-mono text-sm text-foreground">
                                    {typeof metric.value === 'number'
                                        ? metric.value.toLocaleString()
                                        : metric.value}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
