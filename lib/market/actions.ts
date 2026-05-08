'use server';

import { revalidatePath } from 'next/cache';
import { setMarketCookie } from './cookie';
import type { Market } from './types';

export async function switchMarket(market: Market): Promise<void> {
    await setMarketCookie(market);
    revalidatePath('/', 'layout');
}
