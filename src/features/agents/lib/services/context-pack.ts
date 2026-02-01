export type ContextSource = {
    title?: string;
    url?: string;
    snippet?: string;
    publishedAt?: string;
    sourceType?: string;
    provider?: 'exa' | 'perplexity';
};

export type ContextPack = {
    query: string;
    createdAt: string;
    sources: ContextSource[];
    providers: {
        exa?: {
            requestId?: string;
            resultCount: number;
            context?: string;
        };
        perplexity?: {
            id?: string;
            resultCount: number;
        };
    };
};

type ExaSearchResponse = {
    requestId?: string;
    context?: string;
    results?: Array<{
        title?: string;
        url?: string;
        publishedDate?: string;
        summary?: string;
        highlights?: string[];
        text?: string;
    }>;
};

type PerplexitySearchResponse = {
    id?: string;
    results?: Array<{
        title?: string;
        url?: string;
        snippet?: string;
        date?: string;
        last_updated?: string;
    }>;
};

const EXA_ENDPOINT = 'https://api.exa.ai/search';
const PERPLEXITY_ENDPOINT = 'https://api.perplexity.ai/search';

function dedupeSources(sources: ContextSource[]) {
    const seen = new Set<string>();
    return sources.filter((source) => {
        const key = source.url ?? source.title ?? '';
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function normalizeSnippet(result: { summary?: string; highlights?: string[]; text?: string } | undefined) {
    if (!result) return undefined;
    if (result.summary) return result.summary;
    if (result.highlights && result.highlights.length > 0) return result.highlights[0];
    if (result.text) return result.text.slice(0, 280);
    return undefined;
}

export async function searchExa(query: string, options?: { numResults?: number; type?: string }) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(EXA_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
        },
        body: JSON.stringify({
            query,
            numResults: options?.numResults ?? 6,
            type: options?.type ?? 'auto',
            contents: {
                summary: true,
                highlights: true,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`Exa search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ExaSearchResponse;
    const sources = (data.results ?? []).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: normalizeSnippet(result),
        publishedAt: result.publishedDate,
        sourceType: 'web',
        provider: 'exa' as const,
    }));

    return {
        requestId: data.requestId,
        context: data.context,
        sources: dedupeSources(sources),
    };
}

export async function searchPerplexity(query: string, options?: { maxResults?: number; country?: string }) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(PERPLEXITY_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query,
            max_results: options?.maxResults ?? 6,
            max_tokens_per_page: 1024,
            country: options?.country,
        }),
    });

    if (!response.ok) {
        throw new Error(`Perplexity search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as PerplexitySearchResponse;
    const sources = (data.results ?? []).map((result) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        publishedAt: result.date ?? result.last_updated,
        sourceType: 'web',
        provider: 'perplexity' as const,
    }));

    return {
        id: data.id,
        sources: dedupeSources(sources),
    };
}

export function buildContextPack(params: {
    query: string;
    sources: ContextSource[];
    providers: ContextPack['providers'];
}) {
    const sources = dedupeSources(params.sources);
    return {
        query: params.query,
        createdAt: new Date().toISOString(),
        sources,
        providers: params.providers,
    } satisfies ContextPack;
}
