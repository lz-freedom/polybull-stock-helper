import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

interface NewsItem {
    id?: string;
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    summary?: string;
}

interface NewsCardProps {
    symbol: string;
    news: NewsItem[];
}

export function NewsCard({ symbol, news }: NewsCardProps) {
    return (
        <Card className="w-full max-w-full border border-border bg-card text-card-foreground shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    最新资讯 · {symbol}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {news.slice(0, 3).map((item, i) => (
                    <div key={i} className="group border-b border-border pb-3 last:border-0 last:pb-0">
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-opacity hover:opacity-80"
                        >
                            <h4 className="mb-1 line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                                {item.title}
                            </h4>
                            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{item.source}</span>
                                <span className="flex items-center gap-1">
                                    {new Date(item.publishedAt).toLocaleDateString()}
                                    <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                </span>
                            </div>
                        </a>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
