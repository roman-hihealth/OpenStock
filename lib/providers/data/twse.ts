import 'server-only';

const MIS_BASE = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp';
const TWSE_OPENAPI_BASE = 'https://openapi.twse.com.tw/v1';

// =============================================================================
// MIS realtime quotes
// -----------------------------------------------------------------------------
// Public endpoint backing every retail Taiwan stock app. No token, no quota.
// Format: ex_ch=tse_2330.tw|otc_6488.tw — `tse` for TWSE, `otc` for TPEX.
// `z` is the latest matched price; it becomes "-" once the session ends, in
// which case price falls back to the previous close (change = 0). Daily-close
// recovery is delegated to getTwseDailySnapshot() and composed at the provider
// layer.
// =============================================================================

type MisRow = {
    c?: string;   // stock id
    n?: string;   // name
    z?: string;   // latest matched price ("-" outside trading hours)
    y?: string;   // previous close
    o?: string;   // today's open
    h?: string;   // today's high
    l?: string;   // today's low
    v?: string;   // today's accumulated volume (lots)
    ex?: string;  // 'tse' | 'otc'
};

type MisResponse = {
    msgArray?: MisRow[];
    rtcode?: string;
    rtmessage?: string;
};

export type TwseQuote = {
    stockId: string;            // bare numeric id, e.g. "2330"
    symbol: string;             // canonical form with suffix, e.g. "2330.TW"
    name: string;
    price: number;              // last traded; falls back to prevClose after hours
    prevClose: number;
    change: number;
    changePercent: number;
    open: number;
    high: number;
    low: number;
    volume: number;             // 累積成交張數 (lots)
    market: 'TWSE' | 'TPEX';
    isLive: boolean;            // true if MIS surfaced an active matched price
};

function symbolToExCh(symbol: string): { exCh: string; market: 'TWSE' | 'TPEX' } | null {
    const upper = symbol.trim().toUpperCase();
    if (!upper) return null;
    if (upper.endsWith('.TWO')) {
        const id = upper.slice(0, -4);
        return id ? { exCh: `otc_${id}.tw`, market: 'TPEX' } : null;
    }
    if (upper.endsWith('.TW')) {
        const id = upper.slice(0, -3);
        return id ? { exCh: `tse_${id}.tw`, market: 'TWSE' } : null;
    }
    // Bare ticker — assume listed (TWSE).
    return { exCh: `tse_${upper}.tw`, market: 'TWSE' };
}

function parseFloatSafe(value: string | undefined): number {
    if (!value || value === '-') return NaN;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : NaN;
}

function parseMisRow(row: MisRow): TwseQuote {
    const stockId = row.c ?? '';
    const market: 'TWSE' | 'TPEX' = row.ex === 'otc' ? 'TPEX' : 'TWSE';
    const symbol = `${stockId}${market === 'TPEX' ? '.TWO' : '.TW'}`;
    const prevClose = parseFloatSafe(row.y);
    const liveZ = parseFloatSafe(row.z);
    const isLive = Number.isFinite(liveZ);
    const price = isLive ? liveZ : prevClose;
    const change = Number.isFinite(price) && Number.isFinite(prevClose) ? price - prevClose : 0;
    const changePercent =
        Number.isFinite(prevClose) && prevClose > 0 && Number.isFinite(change)
            ? (change / prevClose) * 100
            : 0;

    return {
        stockId,
        symbol,
        name: row.n ?? '',
        price: Number.isFinite(price) ? price : 0,
        prevClose: Number.isFinite(prevClose) ? prevClose : 0,
        change,
        changePercent,
        open: parseFloatSafe(row.o) || 0,
        high: parseFloatSafe(row.h) || 0,
        low: parseFloatSafe(row.l) || 0,
        volume: parseFloatSafe(row.v) || 0,
        market,
        isLive,
    };
}

// Chunk size for MIS batch ex_ch param. URL length stays comfortably under
// 2KB even at 100 (~12 chars per ticker) and avoids any undocumented batch
// limit on the MIS endpoint.
const MIS_CHUNK_SIZE = 100;
// Cap concurrent MIS requests. Fanning out 16+ chunks in parallel reliably
// triggers an "Empty reply from server" / temporary block from MIS, so we run
// a small queue instead. 4 in flight × ~200ms each ≈ same wall-clock as full
// parallel for our typical loads (~16 chunks ≈ 800ms × 4 rounds = ~3.2s) but
// stays under MIS's rate limit.
const MIS_MAX_CONCURRENCY = 4;
// Default Next.js fetch-cache TTL for MIS responses. Heatmap / dashboard
// renders within 30s reuse the cached payload, sparing MIS hits. Override via
// `revalidateSeconds` per call when callers need fresher data (e.g. watchlist
// polling), but keep this conservative — TWSE will block us aggressively on
// short repeat hits.
const MIS_REVALIDATE_DEFAULT = 30;
const MIS_HEADERS = {
    // Browser-like UA + Referer keeps us aligned with the typical retail-app
    // request shape MIS expects; some upstream proxies reject empty UAs.
    'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    Referer: 'https://mis.twse.com.tw/stock/',
    Accept: 'application/json,text/javascript,*/*',
};

async function fetchMisChunk(
    symbols: string[],
    revalidateSeconds: number
): Promise<TwseQuote[]> {
    const exChList = symbols
        .map(symbolToExCh)
        .filter((x): x is { exCh: string; market: 'TWSE' | 'TPEX' } => x !== null)
        .map((x) => x.exCh)
        .join('|');
    if (!exChList) return [];

    // URL must stay stable for Next.js fetch cache to dedupe across requests —
    // no `_=Date.now()` cache-buster.
    const url = `${MIS_BASE}?ex_ch=${exChList}`;
    const init: RequestInit & { next?: { revalidate?: number } } =
        revalidateSeconds > 0
            ? {
                  cache: 'force-cache',
                  next: { revalidate: revalidateSeconds },
                  headers: MIS_HEADERS,
              }
            : { cache: 'no-store', headers: MIS_HEADERS };

    const res = await fetch(url, init);
    if (!res.ok) {
        throw new Error(`MIS HTTP ${res.status}`);
    }
    const json = (await res.json()) as MisResponse;
    if (json.rtcode !== '0000') {
        throw new Error(`MIS error ${json.rtcode}: ${json.rtmessage ?? 'unknown'}`);
    }
    return (json.msgArray ?? []).map(parseMisRow);
}

// Tiny concurrency-limited mapper. Avoids pulling in p-limit just for this.
async function mapWithLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
    const out: PromiseSettledResult<R>[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (true) {
            const idx = cursor++;
            if (idx >= items.length) return;
            try {
                out[idx] = { status: 'fulfilled', value: await fn(items[idx]) };
            } catch (e) {
                out[idx] = { status: 'rejected', reason: e };
            }
        }
    });
    await Promise.all(workers);
    return out;
}

export async function getTwseRealtimeQuotes(
    symbols: string[],
    options: { revalidateSeconds?: number } = {}
): Promise<TwseQuote[]> {
    if (!symbols || symbols.length === 0) return [];
    const ttl = options.revalidateSeconds ?? MIS_REVALIDATE_DEFAULT;

    if (symbols.length <= MIS_CHUNK_SIZE) {
        return fetchMisChunk(symbols, ttl);
    }

    const chunks: string[][] = [];
    for (let i = 0; i < symbols.length; i += MIS_CHUNK_SIZE) {
        chunks.push(symbols.slice(i, i + MIS_CHUNK_SIZE));
    }

    const settled = await mapWithLimit(chunks, MIS_MAX_CONCURRENCY, (chunk) =>
        fetchMisChunk(chunk, ttl)
    );
    const out: TwseQuote[] = [];
    for (const r of settled) {
        if (r.status === 'fulfilled') {
            out.push(...r.value);
        } else {
            console.error('[twse] MIS chunk failed:', r.reason);
        }
    }
    return out;
}

export async function getTwseRealtimeQuote(
    symbol: string,
    options: { revalidateSeconds?: number } = {}
): Promise<TwseQuote | null> {
    const list = await getTwseRealtimeQuotes([symbol], options);
    return list[0] ?? null;
}

// =============================================================================
// TWSE OpenAPI daily snapshot
// -----------------------------------------------------------------------------
// Returns every TWSE-listed stock's closing tick for the most recent trading
// day. Used as a fallback when MIS reports no live match (after hours). One
// request covers the full market (~1700 rows), so cache 30 min and let the
// provider layer index by stockId.
// =============================================================================

export type TwseDailyRow = {
    Date: string;          // ROC date, e.g. "1150506"
    Code: string;
    Name: string;
    TradeVolume: string;
    TradeValue: string;
    OpeningPrice: string;
    HighestPrice: string;
    LowestPrice: string;
    ClosingPrice: string;
    Change: string;
    Transaction: string;
};

export async function getTwseDailySnapshot(revalidateSeconds = 1800): Promise<TwseDailyRow[]> {
    const url = `${TWSE_OPENAPI_BASE}/exchangeReport/STOCK_DAY_ALL`;
    const res = await fetch(url, {
        cache: 'force-cache',
        next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
        throw new Error(`TWSE OpenAPI HTTP ${res.status}`);
    }
    const json = (await res.json()) as TwseDailyRow[];
    return Array.isArray(json) ? json : [];
}
