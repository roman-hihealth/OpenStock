export type Market = 'US' | 'TW';

export const MARKETS: readonly Market[] = ['US', 'TW'] as const;

export const DEFAULT_MARKET: Market = 'US';
