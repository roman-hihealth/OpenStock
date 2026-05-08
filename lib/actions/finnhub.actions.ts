'use server';

import { getMarketFromCookie } from '@/lib/market/cookie';
import type { Market } from '@/lib/market/types';
import { getProvider } from '@/lib/providers/data';

// =============================================================================
// Cookie-driven entries
// -----------------------------------------------------------------------------
// Use these from RSC, server actions invoked by client components, or anything
// that runs inside a request scope. Market is resolved from the `market` cookie.
// =============================================================================

export async function getQuote(symbol: string) {
    const market = await getMarketFromCookie();
    return getProvider(market).getQuote(symbol);
}

export async function getCompanyProfile(symbol: string) {
    const market = await getMarketFromCookie();
    return getProvider(market).getCompanyProfile(symbol);
}

export async function getWatchlistData(symbols: string[]) {
    const market = await getMarketFromCookie();
    return getProvider(market).getWatchlistData(symbols);
}

export async function getNews(symbols?: string[]) {
    const market = await getMarketFromCookie();
    return getProvider(market).getNews(symbols);
}

export async function searchStocks(query?: string) {
    const market = await getMarketFromCookie();
    return getProvider(market).searchStocks(query);
}

// =============================================================================
// Explicit-market entries
// -----------------------------------------------------------------------------
// Use these from Inngest functions, cron handlers, or any code path without a
// request scope (cookies() will throw outside one). Always pass market explicitly.
// =============================================================================

export async function getQuoteFor(market: Market, symbol: string) {
    return getProvider(market).getQuote(symbol);
}

export async function getCompanyProfileFor(market: Market, symbol: string) {
    return getProvider(market).getCompanyProfile(symbol);
}

export async function getWatchlistDataFor(market: Market, symbols: string[]) {
    return getProvider(market).getWatchlistData(symbols);
}

export async function getNewsFor(market: Market, symbols?: string[]) {
    return getProvider(market).getNews(symbols);
}

export async function searchStocksFor(market: Market, query?: string) {
    return getProvider(market).searchStocks(query);
}
