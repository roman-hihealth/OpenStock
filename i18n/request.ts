import { getRequestConfig } from 'next-intl/server';
import { getMarketFromCookie } from '@/lib/market/cookie';

// "Without i18n routing" mode — locale is decided by the `market` cookie
// (US → en, TW → zh-TW), no URL prefix. Switching markets via MarketSwitcher
// already does revalidatePath('/', 'layout'), which re-runs this resolver and
// swaps the messages bundle.
export default getRequestConfig(async () => {
    const market = await getMarketFromCookie();
    const locale = market === 'TW' ? 'zh-TW' : 'en';
    const messages = (await import(`../messages/${locale}.json`)).default;
    return { locale, messages };
});
