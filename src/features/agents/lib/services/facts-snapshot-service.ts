import { db } from '@/lib/db/drizzle';
import {
    factsSnapshots,
    type FactsSnapshot,
    type NewFactsSnapshot,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

const FAST_FINANCE_API_URL =
    'https://fast-finance.polybull.ai/api/v1/ai_help/stock_financial_data_aggregation';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const DEFAULT_CACHE_TTL_MS = THIRTY_MINUTES_MS;

export interface FastFinanceRequest {
    stock_symbol: string;
    exchange_acronym: string;
}

export interface FastFinanceResponse {
    info?: {
        symbol?: string;
        exchange?: string;
        quoteType?: string;
        shortName?: string;
        longName?: string;
        sector?: string;
        industry?: string;
        currency?: string;
        financialCurrency?: string;
        
        // Price
        currentPrice?: number;
        regularMarketPrice?: number;
        previousClose?: number;
        open?: number;
        dayLow?: number;
        dayHigh?: number;
        fiftyTwoWeekLow?: number;
        fiftyTwoWeekHigh?: number;
        
        // Valuation
        marketCap?: number;
        trailingPE?: number;
        forwardPE?: number;
        priceToBook?: number;
        priceToSalesTrailing12Months?: number;
        enterpriseToRevenue?: number;
        enterpriseToEbitda?: number;
        pegRatio?: number;

        // Margins & Returns
        returnOnAssets?: number;
        returnOnEquity?: number;
        grossMargins?: number;
        operatingMargins?: number;
        profitMargins?: number;
        
        // Growth & Cash
        totalRevenue?: number;
        revenueGrowth?: number;
        earningsGrowth?: number;
        freeCashflow?: number;
        totalCash?: number;
        totalDebt?: number;
        debtToEquity?: number;
        
        // Dividends
        dividendYield?: number;
        fiveYearAvgDividendYield?: number;
        payoutRatio?: number;

        [key: string]: unknown;
    };
    
    income_yearly_yefinancials?: Record<string, unknown>[];
    income_quarterly_yefinancials?: Record<string, unknown>[];
    balance_yearly_yefinancials?: Record<string, unknown>[];
    balance_quarterly_yefinancials?: Record<string, unknown>[];
    cashflow_yearly_yefinancials?: Record<string, unknown>[];
    cashflow_quarterly_yefinancials?: Record<string, unknown>[];
    news?: Record<string, unknown>[];
    splits?: Record<string, unknown>[];
    dividends?: Record<string, unknown>[];
    name_and_new_translations?: Record<string, unknown>;
    
    // Legacy / Fallback
    Info?: any;
    AnnualIncomeStatement?: any[];
    QuarterlyIncomeStatement?: any[];
    AnnualBalanceSheet?: any[];
    QuarterlyBalanceSheet?: any[];
    AnnualCashFlow?: any[];
    QuarterlyCashFlow?: any[];
    News?: any[];
    StockSplits?: any[];
    Dividends?: any[];
    NameTranslation?: any;
    [key: string]: unknown;
}

function computeDataHash(data: unknown): string {
    const str = JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex').slice(0, 64);
}

async function fetchFromFastFinanceAPI(
    request: FastFinanceRequest,
): Promise<FastFinanceResponse> {
    const response = await fetch(FAST_FINANCE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(
            `Fast Finance API error: ${response.status} ${response.statusText}`,
        );
    }

    const json = await response.json();
    if (json.code !== '200000') {
        throw new Error(`Fast Finance API returned error: ${json.message}`);
    }
    return json.data;
}

export async function getLatestSnapshot(
    stockSymbol: string,
    exchangeAcronym: string,
): Promise<FactsSnapshot | null> {
    const [snapshot] = await db
        .select()
        .from(factsSnapshots)
        .where(
            and(
                eq(factsSnapshots.stock_symbol, stockSymbol),
                eq(factsSnapshots.exchange_acronym, exchangeAcronym),
            ),
        )
        .orderBy(desc(factsSnapshots.fetchedAt))
        .limit(1);

    return snapshot ?? null;
}

export async function isSnapshotFresh(
    snapshot: FactsSnapshot | null,
    ttlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<boolean> {
    if (!snapshot) return false;

    if (snapshot.expiresAt) {
        return new Date() < snapshot.expiresAt;
    }

    const age = Date.now() - snapshot.fetchedAt.getTime();
    return age < ttlMs;
}

export async function createSnapshot(
    stockSymbol: string,
    exchangeAcronym: string,
    data: FastFinanceResponse,
    expiresAt?: Date,
): Promise<FactsSnapshot> {
    const dataHash = computeDataHash(data);

    const newSnapshot: NewFactsSnapshot = {
        stock_symbol: stockSymbol,
        exchange_acronym: exchangeAcronym,
        data: data as Record<string, unknown>,
        dataHash,
        fetchedAt: new Date(),
        expiresAt,
    };

    const [created] = await db
        .insert(factsSnapshots)
        .values(newSnapshot)
        .returning();

    return created;
}

export interface GetOrFetchSnapshotOptions {
    forceRefresh?: boolean;
    ttlMs?: number;
}

export async function getOrFetchSnapshot(
    stockSymbol: string,
    exchangeAcronym: string,
    options: GetOrFetchSnapshotOptions = {},
): Promise<FactsSnapshot> {
    const { forceRefresh = false, ttlMs = DEFAULT_CACHE_TTL_MS } = options;

    if (!forceRefresh) {
        const existing = await getLatestSnapshot(stockSymbol, exchangeAcronym);
        const fresh = await isSnapshotFresh(existing, ttlMs);

        if (existing && fresh) {
            return existing;
        }
    }

    const data = await fetchFromFastFinanceAPI({
        stock_symbol: stockSymbol,
        exchange_acronym: exchangeAcronym,
    });

    const expiresAt = new Date(Date.now() + ttlMs);
    return createSnapshot(stockSymbol, exchangeAcronym, data, expiresAt);
}

export function extractStockInfo(snapshot: FactsSnapshot) {
    let data = snapshot.data as any;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            // ignore
        }
    }

    const info = data.info ?? data.Info ?? (data.longName ? data : {});

    return {
        symbol: snapshot.stock_symbol,
        exchange: snapshot.exchange_acronym,
        name: (info.longName ?? info.shortName) as string | undefined,
        sector: info.sector as string | undefined,
        industry: info.industry as string | undefined,
        marketCap: info.marketCap as number | undefined,
        currency: info.currency as string | undefined,

        // Price
        currentPrice: (info.currentPrice ?? info.regularMarketPrice) as number | undefined,
        previousClose: info.previousClose as number | undefined,
        open: info.open as number | undefined,
        dayLow: info.dayLow as number | undefined,
        dayHigh: info.dayHigh as number | undefined,
        fiftyTwoWeekLow: info.fiftyTwoWeekLow as number | undefined,
        fiftyTwoWeekHigh: info.fiftyTwoWeekHigh as number | undefined,

        // Valuation
        trailingPE: info.trailingPE as number | undefined,
        forwardPE: info.forwardPE as number | undefined,
        priceToBook: info.priceToBook as number | undefined,
        priceToSales: info.priceToSalesTrailing12Months as number | undefined,
        pegRatio: info.pegRatio as number | undefined,

        // Quality
        returnOnEquity: info.returnOnEquity as number | undefined,
        returnOnAssets: info.returnOnAssets as number | undefined,
        grossMargins: info.grossMargins as number | undefined,
        operatingMargins: info.operatingMargins as number | undefined,
        profitMargins: info.profitMargins as number | undefined,

        // Growth
        revenueGrowth: info.revenueGrowth as number | undefined,
        earningsGrowth: info.earningsGrowth as number | undefined,

        // Dividend
        dividendYield: info.dividendYield as number | undefined,
    };
}

export function extractLatestFinancials(snapshot: FactsSnapshot): {
    annualRevenue?: number;
    quarterlyRevenue?: number;
    annualNetIncome?: number;
    quarterlyNetIncome?: number;
    totalAssets?: number;
    totalDebt?: number;
    freeCashFlow?: number;
} {
    let data = snapshot.data as any;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            // ignore
        }
    }

    const latestAnnualIncome =
        data.income_yearly_yefinancials?.[0] ??
        data.AnnualIncomeStatement?.[0] ??
        data.income_statement_history_yearly?.[0] ??
        {};
    const latestQuarterlyIncome =
        data.income_quarterly_yefinancials?.[0] ??
        data.QuarterlyIncomeStatement?.[0] ??
        data.income_statement_history_quarterly?.[0] ??
        {};
    const latestAnnualBalance =
        data.balance_yearly_yefinancials?.[0] ??
        data.AnnualBalanceSheet?.[0] ??
        data.balance_sheet_history_yearly?.[0] ??
        {};
    const latestAnnualCashFlow =
        data.cashflow_yearly_yefinancials?.[0] ??
        data.AnnualCashFlow?.[0] ??
        data.cashflow_statement_history_yearly?.[0] ??
        {};

    return {
        annualRevenue: (latestAnnualIncome.totalRevenue ??
            latestAnnualIncome.TotalRevenue ??
            latestAnnualIncome.operatingRevenue) as number | undefined,
        quarterlyRevenue: (latestQuarterlyIncome.totalRevenue ??
            latestQuarterlyIncome.TotalRevenue ??
            latestQuarterlyIncome.operatingRevenue) as number | undefined,
        annualNetIncome: (latestAnnualIncome.netIncome ??
            latestAnnualIncome.NetIncome ??
            latestAnnualIncome.netIncomeToCommon) as number | undefined,
        quarterlyNetIncome: (latestQuarterlyIncome.netIncome ??
            latestQuarterlyIncome.NetIncome ??
            latestQuarterlyIncome.netIncomeToCommon) as number | undefined,
        totalAssets: (latestAnnualBalance.totalAssets ??
            latestAnnualBalance.TotalAssets) as number | undefined,
        totalDebt: (latestAnnualBalance.totalDebt ?? latestAnnualBalance.TotalDebt) as
            | number
            | undefined,
        freeCashFlow: (latestAnnualCashFlow.freeCashFlow ??
            latestAnnualCashFlow.FreeCashFlow) as number | undefined,
    };
}

export function extractRecentNews(
    snapshot: FactsSnapshot,
    limit: number = 10,
): Array<{
    title?: string;
    link?: string;
    publisher?: string;
    publishedAt?: string;
}> {
    let data = snapshot.data as any;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            // ignore
        }
    }
    const news = data.news ?? data.News ?? [];

    return news.slice(0, limit).map((item: any) => {
        // Handle new structure where data is nested under 'content'
        const content = (item.content as any) || item;

        return {
            title: (content.title || item.title) as string | undefined,
            link: (content.canonicalUrl?.url || content.link || item.link) as string | undefined,
            publisher: (content.provider?.displayName || content.publisher || item.publisher) as string | undefined,
            publishedAt: (content.pubDate || content.displayTime || item.providerPublishTime || item.publishedAt) as string | undefined,
        };
    });
}
