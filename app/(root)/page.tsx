import { getTranslations } from "next-intl/server";
import TradingViewWidget from "@/components/TradingViewWidget";
import TwMarketOverview from "@/components/dashboard/TwMarketOverview";
import TwHeatmap from "@/components/dashboard/TwHeatmap";
import TwNews from "@/components/dashboard/TwNews";
import {
    HEATMAP_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
    TOP_STORIES_WIDGET_CONFIG
} from "@/lib/constants";
import { getMarketFromCookie } from "@/lib/market/cookie";

const Home = async () => {
    const market = await getMarketFromCookie();
    const isTw = market === 'TW';
    const t = await getTranslations('home');
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    return (
        <div className="flex min-h-screen home-wrapper">
            <section className="grid w-full gap-8 home-section">
                <div className="md:col-span-1 xl:col-span-1">
                    {isTw ? (
                        <TwMarketOverview />
                    ) : (
                        <TradingViewWidget
                            title={t('marketOverview')}
                            scriptUrl={`${scriptUrl}market-overview.js`}
                            config={MARKET_OVERVIEW_WIDGET_CONFIG(market)}
                            className="custom-chart"
                            height={600}
                        />
                    )}
                </div>
                <div className="md-col-span xl:col-span-2">
                    {isTw ? (
                        <TwHeatmap />
                    ) : (
                        <TradingViewWidget
                            title={t('stockHeatmap')}
                            scriptUrl={`${scriptUrl}stock-heatmap.js`}
                            config={HEATMAP_WIDGET_CONFIG(market)}
                            height={600}
                        />
                    )}
                </div>
            </section>
            <section className="grid w-full gap-8 home-section">
                {isTw ? (
                    <div className="h-full md:col-span-2 xl:col-span-3">
                        <TwNews />
                    </div>
                ) : (
                    <>
                        <div className="h-full md:col-span-1 xl:col-span-2">
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}market-quotes.js`}
                                config={MARKET_DATA_WIDGET_CONFIG(market)}
                                height={600}
                            />
                        </div>
                        <div className="h-full md:col-span-1 xl:col-span-1">
                            <TradingViewWidget
                                scriptUrl={`${scriptUrl}timeline.js`}
                                config={TOP_STORIES_WIDGET_CONFIG(market)}
                                height={600}
                            />
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}

export default Home;
