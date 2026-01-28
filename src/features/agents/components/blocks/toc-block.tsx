import { cn } from '@/lib/utils';
import { TocBlock } from '@/features/agents/lib/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TocBlockProps {
  block: TocBlock;
}

export function TocBlockComponent({ block }: TocBlockProps) {
  return (
    <Card className="mb-6 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          {block.title || 'Table of Contents'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <nav className="flex flex-col space-y-1">
          {block.sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "text-sm hover:text-primary transition-colors py-1",
                section.active ? "text-primary font-medium" : "text-muted-foreground",
                section.level && section.level > 1 && `pl-${(section.level - 1) * 4}`
              )}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </CardContent>
    </Card>
  );
}
