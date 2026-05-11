import 'server-only';

const FUGLE_BASE = 'https://api.fugle.tw/marketdata/v1.0/stock';
const FUGLE_REVALIDATE = 60;

type FugleSnapshotItem = {
    type?: string;
    symbol?: string;
    name?: string;
    openPrice?: number;
    highPrice?: number;
    lowPrice?: number;
    closePrice?: number;
    change?: number;
    changePercent?: number;
    tradeVolume?: number;
    tradeValue?: number;
    lastUpdated?: number;
};

type FugleSnapshotResponse = {
    date?: string;
    data?: FugleSnapshotItem[];
};

export type FugleQuote = {
    stockId: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    tradeValue: number;
    market: 'TWSE' | 'TPEX';
};

async function fetchFugleSnapshot(
    market: 'TSE' | 'OTC',
    revalidateSeconds: number
): Promise<FugleQuote[]> {
    const apiKey = process.env.FUGLE_API_KEY;
    if (!apiKey) throw new Error('FUGLE_API_KEY not set');

    const url = `${FUGLE_BASE}/snapshot/quotes/${market}?type=ALLBUT0999`;
    const res = await fetch(url, {
        cache: 'force-cache',
        next: { revalidate: revalidateSeconds },
        headers: { 'X-API-KEY': apiKey },
    });
    if (!res.ok) throw new Error(`Fugle ${market} snapshot HTTP ${res.status}`);

    const json = (await res.json()) as FugleSnapshotResponse;
    const items = json.data ?? [];
    const targetMarket: 'TWSE' | 'TPEX' = market === 'TSE' ? 'TWSE' : 'TPEX';

    return items
        .filter((item) => !!item.symbol && (item.closePrice ?? 0) > 0 && (item.tradeValue ?? 0) > 0)
        .map((item) => ({
            stockId: item.symbol!,
            name: item.name ?? item.symbol!,
            price: item.closePrice ?? 0,
            change: item.change ?? 0,
            changePercent: item.changePercent ?? 0,
            tradeValue: item.tradeValue ?? 0,
            market: targetMarket,
        }));
}

// =============================================================================
// Intraday quote — individual stock (Basic plan supported)
// =============================================================================

type FugleIntradayQuoteResponse = {
    symbol?: string;
    name?: string;
    exchange?: string;
    market?: string;
    previousClose?: number;
    closePrice?: number;
    change?: number;
    changePercent?: number;
    total?: { tradeValue?: number; tradeVolume?: number };
};

export type FugleIntradayQuote = {
    stockId: string;
    name: string;
    price: number;
    previousClose: number;
    change: number;
    changePercent: number;
    tradeValue: number;
};

async function fetchFugleIntradayQuote(
    stockId: string,
    apiKey: string
): Promise<FugleIntradayQuote | null> {
    const url = `${FUGLE_BASE}/intraday/quote/${stockId}`;
    const res = await fetch(url, {
        cache: 'force-cache',
        next: { revalidate: 30 },
        headers: { 'X-API-KEY': apiKey },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as FugleIntradayQuoteResponse;
    const price = json.closePrice ?? 0;
    if (!price) return null;
    return {
        stockId,
        name: json.name ?? stockId,
        price,
        previousClose: json.previousClose ?? 0,
        change: json.change ?? 0,
        changePercent: json.changePercent ?? 0,
        tradeValue: json.total?.tradeValue ?? 0,
    };
}

// Fetch multiple stocks in parallel. Silently drops any that fail.
export async function getFugleIntradayQuotes(
    stockIds: string[]
): Promise<Map<string, FugleIntradayQuote>> {
    const apiKey = process.env.FUGLE_API_KEY;
    if (!apiKey) return new Map();

    const results = await Promise.allSettled(
        stockIds.map((id) => fetchFugleIntradayQuote(id, apiKey))
    );

    const map = new Map<string, FugleIntradayQuote>();
    results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
            map.set(stockIds[i], r.value);
        }
    });
    return map;
}

// =============================================================================
// Snapshot — full market (Developer plan required)
// =============================================================================

// Fetches all TWSE (TSE) + TPEX (OTC) stocks in 2 parallel calls.
export async function getFugleAllQuotes(
    revalidateSeconds = FUGLE_REVALIDATE
): Promise<FugleQuote[]> {
    const [tse, otc] = await Promise.allSettled([
        fetchFugleSnapshot('TSE', revalidateSeconds),
        fetchFugleSnapshot('OTC', revalidateSeconds),
    ]);

    const out: FugleQuote[] = [];
    if (tse.status === 'fulfilled') out.push(...tse.value);
    else console.error('[fugle] TSE snapshot failed:', tse.reason);
    if (otc.status === 'fulfilled') out.push(...otc.value);
    else console.error('[fugle] OTC snapshot failed:', otc.reason);

    return out;
}
