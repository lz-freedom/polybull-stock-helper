import { ScorePanelBlock } from '@/features/agents/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScorePanelBlockProps {
  block: ScorePanelBlock;
}

const recommendationColors = {
  strong_buy: 'bg-green-600',
  buy: 'bg-green-500',
  hold: 'bg-yellow-500',
  sell: 'bg-red-500',
  strong_sell: 'bg-red-600',
};

const recommendationLabels = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  sell: 'Sell',
  strong_sell: 'Strong Sell',
};

function SimpleProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full bg-secondary overflow-hidden rounded-full", className)}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function ScorePanelBlockComponent({ block }: ScorePanelBlockProps) {
  const { final_verdict, dimension_details } = block.score;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">{block.title || 'Analysis Score'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-muted/30 rounded-lg">
          <div className="text-center md:text-left">
            <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
            <div className="text-5xl font-bold tracking-tight text-primary">
              {final_verdict.score}
              <span className="text-xl text-muted-foreground ml-1">/10</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end">
             <Badge 
               className={cn(
                 "text-lg px-4 py-1 mb-2 text-white", 
                 recommendationColors[final_verdict.recommendation] || 'bg-gray-500'
               )}
             >
               {recommendationLabels[final_verdict.recommendation]}
             </Badge>
             <div className="text-sm text-muted-foreground">
               Confidence: {final_verdict.confidence}%
             </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {dimension_details.map((dim, idx) => (
            <div key={`${dim.dimension}-${idx}`} className="space-y-2 p-3 border rounded-md">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">{dim.dimension}</span>
                <span className="font-bold">{dim.score}/10</span>
              </div>
              <SimpleProgress value={dim.score * 10} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {dim.reasoning}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
