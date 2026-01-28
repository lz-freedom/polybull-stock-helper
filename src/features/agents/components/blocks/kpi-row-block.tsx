import { KpiRowBlock } from '@/features/agents/lib/schemas';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

interface KpiRowBlockProps {
  block: KpiRowBlock;
}

const trendIcons = {
  up: ArrowUp,
  down: ArrowDown,
  neutral: ArrowRight,
};

const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-500 dark:text-gray-400',
};

const statusColors = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  neutral: 'bg-card border-border',
};

export function KpiRowBlockComponent({ block }: KpiRowBlockProps) {
  return (
    <div className="mb-6">
      {block.title && (
        <h3 className="text-lg font-semibold mb-3">{block.title}</h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {block.items.map((item, index) => {
          const TrendIcon = item.trend ? trendIcons[item.trend] : null;
          const statusClass = item.status ? statusColors[item.status] : statusColors.neutral;

          return (
            <Card key={`${item.label}-${index}`} className={cn("border shadow-sm", statusClass)}>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground font-medium mb-1">
                  {item.label}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{item.value}</div>
                  {item.change && (
                    <div
                      className={cn(
                        "text-xs font-medium flex items-center",
                        item.trend && trendColors[item.trend]
                      )}
                    >
                      {TrendIcon && <TrendIcon className="w-3 h-3 mr-0.5" />}
                      {item.change}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
