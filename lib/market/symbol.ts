import type { Market } from './types';

const TW_SUFFIXES = new Set(['TW', 'TWO']);

/**
 * Infers the market a symbol belongs to from its suffix.
 *
 * - "2330.TW", "6488.TWO" → 'TW'
 * - everything else (incl. bare US tickers like "AAPL", or other intl. suffixes
 *   like "BABA", "0700.HK") → 'US'
 *
 * Used to keep `/stocks/[symbol]` routing market-aware and to drive
 * presentation forks (e.g. self-rendered TW financials vs TradingView widget)
 * without requiring the caller to know the active market cookie.
 */
export function marketFromSymbol(symbol: string): Market {
    if (!symbol) return 'US';
    const upper = symbol.toUpperCase();
    const idx = upper.lastIndexOf('.');
    if (idx === -1) return 'US';
    const suffix = upper.slice(idx + 1);
    return TW_SUFFIXES.has(suffix) ? 'TW' : 'US';
}
