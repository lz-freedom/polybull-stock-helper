import { TableBlock } from '@/features/agents/lib/schemas';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TableBlockProps {
  block: TableBlock;
}

export function TableBlockComponent({ block }: TableBlockProps) {
  return (
    <Card className="mb-6">
      {block.title && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{block.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={block.title ? 'pt-0' : 'pt-6'}>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                {block.columns.map((col, i) => (
                  <th
                    key={col}
                    className="h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {block.rows.map((row, i) => (
                <tr
                  key={`row-${i}-${JSON.stringify(Object.values(row)[0])}`}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {block.columns.map((col, j) => (
                    <td
                      key={`${col}-${i}`}
                      className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                    >
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
