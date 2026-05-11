import 'server-only';

export type NewsItem = {
    id: string;
    title: string;
    summary: string;
    url: string;
    publishedAt: number; // unix seconds
    source: 'cnyes' | 'yahoo' | 'udn';
    sourceName: string;
    thumbnailUrl?: string;
    relatedStocks?: string[];
};

// ── RSS helpers ───────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
    // Handles both <![CDATA[...]]> and plain text content.
    const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
    return m?.[1]?.trim() ?? '';
}

function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string; guid: string }> {
    const items: ReturnType<typeof parseRssItems> = [];
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
        items.push({
            title: extractTag(m[1], 'title'),
            link: extractTag(m[1], 'link'),
            pubDate: extractTag(m[1], 'pubDate'),
            description: extractTag(m[1], 'description'),
            guid: extractTag(m[1], 'guid'),
        });
    }
    return items;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

// ── Source: 鉅亨網 ────────────────────────────────────────────────────────────

type CnyesItem = {
    newsId: number;
    title: string;
    summary: string;
    publishAt: number;
    coverSrc?: { s?: { src: string } };
    stock?: string[];
};

type CnyesResponse = {
    statusCode?: number;
    items?: { data?: CnyesItem[] };
};

async function fetchCnyes(limit = 20): Promise<NewsItem[]> {
    const url = `https://api.cnyes.com/media/api/v1/newslist/category/tw_stock_news?limit=${limit}`;
    const res = await fetch(url, { cache: 'force-cache', next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`cnyes HTTP ${res.status}`);
    const json = (await res.json()) as CnyesResponse;
    const items = json.items?.data ?? [];
    return items.map((item) => ({
        id: `cnyes-${item.newsId}`,
        title: item.title,
        summary: item.summary ?? '',
        url: `https://news.cnyes.com/news/id/${item.newsId}`,
        publishedAt: item.publishAt,
        source: 'cnyes' as const,
        sourceName: '鉅亨網',
        thumbnailUrl: item.coverSrc?.s?.src,
        relatedStocks: item.stock?.filter((s) => /^\d{4,6}$/.test(s)),
    }));
}

// ── Source: Yahoo Finance TW ──────────────────────────────────────────────────

async function fetchYahoo(limit = 15): Promise<NewsItem[]> {
    const url = 'https://tw.stock.yahoo.com/rss';
    const res = await fetch(url, { cache: 'force-cache', next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`yahoo rss HTTP ${res.status}`);
    const xml = await res.text();
    return parseRssItems(xml)
        .slice(0, limit)
        .map((item, i) => ({
            id: `yahoo-${i}-${item.guid || item.link}`,
            title: item.title,
            summary: stripHtml(item.description),
            url: item.link,
            publishedAt: item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : 0,
            source: 'yahoo' as const,
            sourceName: 'Yahoo股市',
        }));
}

// ── Source: 經濟日報 ──────────────────────────────────────────────────────────

async function fetchUdn(limit = 15): Promise<NewsItem[]> {
    const url = 'https://money.udn.com/rssfeed/news/1001/5612?ch=money';
    const res = await fetch(url, { cache: 'force-cache', next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`udn rss HTTP ${res.status}`);
    const xml = await res.text();
    return parseRssItems(xml)
        .slice(0, limit)
        .map((item, i) => ({
            id: `udn-${i}-${item.guid || item.link}`,
            title: item.title,
            summary: stripHtml(item.description),
            url: item.link,
            publishedAt: item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : 0,
            source: 'udn' as const,
            sourceName: '經濟日報',
        }));
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getTwNews(limit = 40): Promise<NewsItem[]> {
    const [cnyes, yahoo, udn] = await Promise.allSettled([
        fetchCnyes(20),
        fetchYahoo(15),
        fetchUdn(15),
    ]);

    const all: NewsItem[] = [];
    if (cnyes.status === 'fulfilled') all.push(...cnyes.value);
    else console.error('[tw-news] cnyes failed:', cnyes.reason);
    if (yahoo.status === 'fulfilled') all.push(...yahoo.value);
    else console.error('[tw-news] yahoo failed:', yahoo.reason);
    if (udn.status === 'fulfilled') all.push(...udn.value);
    else console.error('[tw-news] udn failed:', udn.reason);

    return all
        .filter((n) => n.title && n.url)
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, limit);
}
