import 'server-only';
import { cache } from 'react';
import { POPULAR_TW_SYMBOLS } from '@/lib/constants';
import { fetchFinMind } from './finmind';
import { getTwseRealtimeQuote, getTwseRealtimeQuotes } from './twse';
import type {
    DataProvider,
    ProviderCompanyProfile,
    ProviderQuote,
    ProviderWatchlistRow,
} from './types';

type FinMindStockInfo = {
    industry_category: string;
    stock_id: string;
    stock_name: string;
    type: string; // 'twse' | 'tpex' | 'emerging' | etf-codes etc.
    date?: string;
};

type FinMindNewsRow = {
    date: string;
    stock_id: string;
    link: string;
    source: string;
    title: string;
    description?: string;
};

function stripTwSuffix(symbol: string): string {
    const upper = symbol.trim().toUpperCase();
    if (upper.endsWith('.TWO')) return upper.slice(0, -4);
    if (upper.endsWith('.TW')) return upper.slice(0, -3);
    return upper;
}

function symbolFromInfo(row: FinMindStockInfo): string {
    return `${row.stock_id}${row.type === 'tpex' ? '.TWO' : '.TW'}`;
}

function exchangeLabel(row: FinMindStockInfo): string {
    if (row.type === 'tpex') return 'TPEX';
    if (row.type === 'twse') return 'TWSE';
    return 'TW';
}

// Hash a URL into a stable positive integer for MarketNewsArticle.id
// (callers use it for React keys; FinMind doesn't expose a numeric id).
function hashStringToInt(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

// Per-request memoised; underlying fetch already revalidates daily.
// FinMind's TaiwanStockInfo is a historical snapshot table that returns one row
// per (stock_id, listing_date), so the same stock_id appears multiple times.
// Dedupe by keeping the freshest row per id.
const getTwStockUniverse = cache(async (): Promise<FinMindStockInfo[]> => {
    try {
        const all = await fetchFinMind<FinMindStockInfo>('TaiwanStockInfo', {}, 86400);
        const byId = new Map<string, FinMindStockInfo>();
        for (const row of all) {
            const existing = byId.get(row.stock_id);
            if (!existing || (row.date ?? '') > (existing.date ?? '')) {
                byId.set(row.stock_id, row);
            }
        }
        return Array.from(byId.values());
    } catch (e) {
        console.error('Error fetching TaiwanStockInfo:', e);
        return [];
    }
});

async function getQuote(symbol: string): Promise<ProviderQuote | null> {
    try {
        const q = await getTwseRealtimeQuote(symbol);
        if (!q) return null;
        return {
            c: q.price,
            d: q.change,
            dp: q.changePercent,
        };
    } catch (e) {
        console.error('Error fetching TW quote for', symbol, e);
        return null;
    }
}

async function getCompanyProfile(symbol: string): Promise<ProviderCompanyProfile | null> {
    try {
        const id = stripTwSuffix(symbol);
        const universe = await getTwStockUniverse();
        const row = universe.find((r) => r.stock_id === id);
        if (!row) return null;
        return {
            currency: 'TWD',
            exchange: exchangeLabel(row),
            name: row.stock_name,
            ticker: row.stock_id,
            // logo / marketCapitalization not available from FinMind free tier
        };
    } catch (e) {
        console.error('Error fetching TW profile for', symbol, e);
        return null;
    }
}

async function getWatchlistData(symbols: string[]): Promise<ProviderWatchlistRow[]> {
    if (!symbols || symbols.length === 0) return [];

    try {
        const [quotes, universe] = await Promise.all([
            getTwseRealtimeQuotes(symbols),
            getTwStockUniverse(),
        ]);

        const profileById = new Map(universe.map((r) => [r.stock_id, r]));
        const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

        return symbols.map((symbol) => {
            const id = stripTwSuffix(symbol);
            const profile = profileById.get(id);
            // Quote map key is canonical (e.g. "2330.TW"); fall back across
            // listed/OTC suffixes if the caller passed a bare id.
            const quote =
                quoteBySymbol.get(symbol) ??
                quoteBySymbol.get(`${id}.TW`) ??
                quoteBySymbol.get(`${id}.TWO`);

            return {
                symbol,
                price: quote?.price ?? 0,
                change: quote?.change ?? 0,
                changePercent: quote?.changePercent ?? 0,
                currency: 'TWD',
                name: profile?.stock_name ?? symbol,
                logo: undefined,
                marketCap: undefined,
                peRatio: 0,
            };
        });
    } catch (e) {
        console.error('Error fetching TW watchlist data:', e);
        return [];
    }
}

async function getNews(symbols?: string[]): Promise<MarketNewsArticle[]> {
    try {
        const cleaned = (symbols || [])
            .map((s) => stripTwSuffix(s))
            .filter(Boolean);

        // FinMind's TaiwanStockNews only returns rows when data_id is provided;
        // fall back to the top popular tickers when caller has no symbols so the
        // dashboard still renders meaningful news instead of an empty grid.
        const ids =
            cleaned.length > 0
                ? cleaned
                : POPULAR_TW_SYMBOLS.slice(0, 3).map(stripTwSuffix);

        const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const perSymbol = await Promise.all(
            ids.map(async (id) => {
                try {
                    return await fetchFinMind<FinMindNewsRow>(
                        'TaiwanStockNews',
                        { data_id: id, start_date: startDate },
                        300
                    );
                } catch (e) {
                    console.error('Error fetching TW news for', id, e);
                    return [];
                }
            })
        );

        const collected: MarketNewsArticle[] = [];
        const maxArticles = 6;
        for (let round = 0; round < maxArticles; round++) {
            for (const list of perSymbol) {
                if (round >= list.length) continue;
                const row = list[round];
                if (!row?.title || !row.link) continue;
                collected.push({
                    id: hashStringToInt(row.link),
                    headline: row.title,
                    summary: row.description || row.title,
                    source: row.source || 'TW Market News',
                    url: row.link,
                    datetime: Math.floor(new Date(row.date).getTime() / 1000),
                    category: 'company',
                    related: row.stock_id,
                });
                if (collected.length >= maxArticles) break;
            }
            if (collected.length >= maxArticles) break;
        }

        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
    } catch (e) {
        console.error('TW getNews error:', e);
        throw new Error('Failed to fetch news');
    }
}

const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
    try {
        const universe = await getTwStockUniverse();
        const tradable = universe.filter((r) => r.type === 'twse' || r.type === 'tpex');

        const trimmed = typeof query === 'string' ? query.trim() : '';

        let candidates: FinMindStockInfo[];
        if (!trimmed) {
            const topIds = POPULAR_TW_SYMBOLS.slice(0, 10).map(stripTwSuffix);
            candidates = topIds
                .map((id) => tradable.find((r) => r.stock_id === id))
                .filter((r): r is FinMindStockInfo => Boolean(r));
        } else {
            const q = trimmed.toLowerCase();
            candidates = tradable
                .filter(
                    (r) =>
                        r.stock_id.toLowerCase().includes(q) ||
                        r.stock_name.toLowerCase().includes(q)
                )
                .slice(0, 30);
        }

        return candidates.slice(0, 15).map((r) => ({
            symbol: symbolFromInfo(r),
            name: r.stock_name,
            exchange: exchangeLabel(r),
            type: 'Stock',
            isInWatchlist: false,
        }));
    } catch (e) {
        console.error('TW searchStocks error:', e);
        return [];
    }
});

export const twDataProvider: DataProvider = {
    getQuote,
    getCompanyProfile,
    getWatchlistData,
    getNews,
    searchStocks,
};
