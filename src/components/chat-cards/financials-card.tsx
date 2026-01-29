import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Key Financials: {symbol}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {metrics.map((metric, i) => (
                            <TableRow key={i} className="hover:bg-transparent">
                                <TableCell className="font-medium py-2 text-muted-foreground text-xs">
                                    {metric.label}
                                </TableCell>
                                <TableCell className="text-right py-2 font-mono text-sm">
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
