import { CalloutBlock } from '@/features/agents/lib/schemas';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface CalloutBlockProps {
  block: CalloutBlock;
}

const intentStyles = {
  info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
  warning: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800',
  success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
  danger: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800',
  neutral: 'bg-gray-50 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
};

const intentIcons = {
  info: Info,
  warning: AlertCircle,
  success: CheckCircle2,
  danger: XCircle,
  neutral: Info,
};

export function CalloutBlockComponent({ block }: CalloutBlockProps) {
  const Icon = intentIcons[block.intent] || Info;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border flex items-start gap-3 mb-6',
        intentStyles[block.intent]
      )}
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="space-y-1">
        {block.title && (
          <h4 className="font-semibold">{block.title}</h4>
        )}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {block.content}
        </div>
      </div>
    </div>
  );
}
