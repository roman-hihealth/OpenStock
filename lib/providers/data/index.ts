import 'server-only';
import type { Market } from '@/lib/market/types';
import type { DataProvider } from './types';
import { twDataProvider } from './tw';
import { usDataProvider } from './us';

export function getProvider(market: Market): DataProvider {
    if (market === 'TW') return twDataProvider;
    return usDataProvider;
}

export type { DataProvider };
