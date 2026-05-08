import type { Market } from '@/lib/market/types';

export type { Market };

export type ProviderQuote = {
    c?: number;
    d?: number;
    dp?: number;
};

export type ProviderCompanyProfile = {
    currency?: string;
    exchange?: string;
    logo?: string;
    marketCapitalization?: number;
    name?: string;
    ticker?: string;
};

export type ProviderWatchlistRow = {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
    name: string;
    logo?: string;
    marketCap?: number;
    peRatio: number;
};

export interface DataProvider {
    getQuote(symbol: string): Promise<ProviderQuote | null>;
    getCompanyProfile(symbol: string): Promise<ProviderCompanyProfile | null>;
    getWatchlistData(symbols: string[]): Promise<ProviderWatchlistRow[]>;
    getNews(symbols?: string[]): Promise<MarketNewsArticle[]>;
    searchStocks(query?: string): Promise<StockWithWatchlistStatus[]>;
}
