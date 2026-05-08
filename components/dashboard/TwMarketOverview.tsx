import Link from 'next/link';
import {
    getTwseDailySnapshot,
    getTwseRealtimeQuotes,
    type TwseQuote,
} from '@/lib/providers/data/twse';
import { cn } from '@/lib/utils';

type RowQuote = { price: number; changePercent: number; isLive: boolean };

type SectorSymbol = { symbol: string; name: string };

const SECTORS: { name: string; symbols: SectorSymbol[] }[] = [
    {
        name: '半導體',
        symbols: [
            { symbol: '2330.TW', name: '台積電' },
            { symbol: '2454.TW', name: '聯發科' },
            { symbol: '2308.TW', name: '台達電' },
            { symbol: '3008.TW', name: '大立光' },
            { symbol: '2303.TW', name: '聯電' },
            { symbol: '6488.TWO', name: '環球晶' },
        ],
    },
    {
        name: '金融',
        symbols: [
            { symbol: '2882.TW', name: '國泰金' },
            { symbol: '2891.TW', name: '中信金' },
            { symbol: '2886.TW', name: '兆豐金' },
            { symbol: '2884.TW', name: '玉山金' },
            { symbol: '2881.TW', name: '富邦金' },
            { symbol: '2883.TW', name: '開發金' },
        ],
    },
    {
        name: '電子',
        symbols: [
            { symbol: '2317.TW', name: '鴻海' },
            { symbol: '2412.TW', name: '中華電' },
            { symbol: '2382.TW', name: '廣達' },
            { symbol: '2357.TW', name: '華碩' },
            { symbol: '3711.TW', name: '日月光投控' },
            { symbol: '2474.TW', name: '可成' },
        ],
    },
    {
        name: '傳產',
        symbols: [
            { symbol: '1301.TW', name: '台塑' },
            { symbol: '1303.TW', name: '南亞' },
            { symbol: '2002.TW', name: '中鋼' },
            { symbol: '1216.TW', name: '統一' },
            { symbol: '2912.TW', name: '統一超' },
            { symbol: '1101.TW', name: '台泥' },
        ],
    },
];

export default async function TwMarketOverview() {
    const allSymbols = SECTORS.flatMap((s) => s.symbols.map((x) => x.symbol));
    let quotes: TwseQuote[] = [];
    try {
        quotes = await getTwseRealtimeQuotes(allSymbols);
    } catch (e) {
        console.error('TwMarketOverview MIS fetch failed:', e);
    }

    const quoteMap = new Map<string, RowQuote>();
    for (const q of quotes) {
        if (q.price > 0) {
            quoteMap.set(q.symbol, {
                price: q.price,
                changePercent: q.changePercent,
                isLive: q.isLive,
            });
        }
    }

    // If MIS is rate-limiting / blocking us, fill the gaps from STOCK_DAY_ALL
    // (yesterday's close during trading hours, today's after market close).
    if (quoteMap.size < allSymbols.length) {
        try {
            const snapshot = await getTwseDailySnapshot(900);
            const byCode = new Map(snapshot.map((r) => [r.Code, r]));
            for (const sym of allSymbols) {
                if (quoteMap.has(sym)) continue;
                const id = sym.replace(/\.TWO?$/, '');
                const row = byCode.get(id);
                if (!row) continue;
                const close = parseFloat(row.ClosingPrice || '0');
                const change = parseFloat(row.Change || '0');
                if (!Number.isFinite(close) || close <= 0) continue;
                const prev = close - change;
                const changePct = prev > 0 ? (change / prev) * 100 : 0;
                quoteMap.set(sym, { price: close, changePercent: changePct, isLive: false });
            }
        } catch (e) {
            console.error('TwMarketOverview daily fallback failed:', e);
        }
    }

    return (
        <div
            className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 overflow-y-auto"
            style={{ height: 600 }}
        >
            <h2 className="text-lg font-semibold text-white mb-4">Market Overview</h2>
            <div className="space-y-5">
                {SECTORS.map((sector) => (
                    <div key={sector.name}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                            {sector.name}
                        </h3>
                        <div className="space-y-1">
                            {sector.symbols.map(({ symbol, name }) => {
                                const q = quoteMap.get(symbol);
                                const change = q?.changePercent ?? 0;
                                const isPositive = change >= 0;
                                const stockId = symbol.replace(/\.TWO?$/, '');
                                return (
                                    <Link
                                        key={symbol}
                                        href={`/stocks/${symbol}`}
                                        className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-baseline gap-2 min-w-0">
                                            <span className="text-xs font-mono text-gray-500 w-12">{stockId}</span>
                                            <span className="text-sm font-medium text-white truncate">{name}</span>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 ml-2">
                                            <span className="text-sm font-mono tabular-nums text-white">
                                                {q && q.price > 0 ? q.price.toFixed(2) : '—'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-xs font-mono tabular-nums',
                                                    // TW convention: 紅漲綠跌
                                                    !q ? 'text-gray-500' : isPositive ? 'text-red-400' : 'text-green-400'
                                                )}
                                            >
                                                {q ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : 'N/A'}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
