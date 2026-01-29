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
        <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-muted">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    Latest News for {symbol}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {news.slice(0, 3).map((item, i) => (
                    <div key={i} className="group border-b last:border-0 border-muted pb-3 last:pb-0">
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:opacity-80 transition-opacity"
                        >
                            <h4 className="font-medium text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                {item.title}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                <span>{item.source}</span>
                                <span className="flex items-center gap-1">
                                    {new Date(item.publishedAt).toLocaleDateString()}
                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                            </div>
                        </a>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
