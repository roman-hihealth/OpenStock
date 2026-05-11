import { getTwNews, type NewsItem } from '@/lib/providers/data/tw-news';

const SOURCE_COLORS: Record<NewsItem['source'], string> = {
    cnyes: 'bg-orange-500/20 text-orange-400',
    yahoo: 'bg-purple-500/20 text-purple-400',
    udn: 'bg-blue-500/20 text-blue-400',
};

function timeAgo(unixSeconds: number): string {
    const diff = Math.floor(Date.now() / 1000) - unixSeconds;
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    return `${Math.floor(diff / 86400)} 天前`;
}

function NewsCard({ item }: { item: NewsItem }) {
    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
        >
            {item.thumbnailUrl && (
                <img
                    src={item.thumbnailUrl}
                    alt=""
                    width={72}
                    height={48}
                    className="w-18 h-12 object-cover rounded shrink-0 opacity-90 group-hover:opacity-100"
                />
            )}
            <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-gray-100">
                    {item.title}
                </p>
                {item.summary && (
                    <p className="text-xs text-gray-500 line-clamp-1">{item.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS[item.source]}`}>
                        {item.sourceName}
                    </span>
                    {item.relatedStocks && item.relatedStocks.length > 0 && (
                        <span className="text-[10px] text-gray-600 font-mono">
                            {item.relatedStocks.slice(0, 3).join(' · ')}
                        </span>
                    )}
                    <span className="text-[10px] text-gray-600 ml-auto shrink-0">
                        {timeAgo(item.publishedAt)}
                    </span>
                </div>
            </div>
        </a>
    );
}

export default async function TwNews() {
    const news = await getTwNews(40);

    return (
        <div
            className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 flex flex-col"
            style={{ height: 600 }}
        >
            <div className="flex items-baseline justify-between mb-3 shrink-0">
                <h2 className="text-lg font-semibold text-white">台股新聞</h2>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS.cnyes}`}>鉅亨網</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS.yahoo}`}>Yahoo股市</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SOURCE_COLORS.udn}`}>經濟日報</span>
                </div>
            </div>

            {news.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    無法取得新聞資料
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1 px-1">
                    {news.map((item) => (
                        <NewsCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
