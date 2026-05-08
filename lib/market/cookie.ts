import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_MARKET, type Market } from './types';

const COOKIE_NAME = 'market';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getMarketFromCookie(): Promise<Market> {
    const store = await cookies();
    const value = store.get(COOKIE_NAME)?.value;
    return value === 'TW' ? 'TW' : DEFAULT_MARKET;
}

export async function setMarketCookie(market: Market): Promise<void> {
    const store = await cookies();
    store.set(COOKIE_NAME, market, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
    });
}
