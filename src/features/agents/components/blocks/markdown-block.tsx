import { MarkdownBlock } from '@/features/agents/lib/schemas';
import { cn } from '@/lib/utils';

interface MarkdownBlockProps {
  block: MarkdownBlock;
}

export function MarkdownBlockComponent({ block }: MarkdownBlockProps) {
  return (
    <div className={cn("prose dark:prose-invert max-w-none mb-6", "space-y-4")}>
      {block.title && (
        <h3 className="text-xl font-semibold mb-3">{block.title}</h3>
      )}
      <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
        {block.content}
      </div>
    </div>
  );
}
