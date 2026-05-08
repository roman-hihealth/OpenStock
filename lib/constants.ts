import type { Market } from '@/lib/market/types';

// `labelKey` is resolved against the `nav` namespace via next-intl;
// see messages/{en,zh-TW}.json.
export const NAV_ITEMS = [
    { href: '/', labelKey: 'dashboard' as const },
    { href: '/search', labelKey: 'search' as const },
    { href: '/watchlist', labelKey: 'watchlist' as const },
];

// Sign-up form select options
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: 'Growth' },
    { value: 'Income', label: 'Income' },
    { value: 'Balanced', label: 'Balanced' },
    { value: 'Conservative', label: 'Conservative' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Consumer Goods', label: 'Consumer Goods' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: 'Upper' },
    { value: 'lower', label: 'Lower' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: 'Greater than (>)' },
    { value: 'less', label: 'Less than (<)' },
];

// =============================================================================
// TradingView widget configs — market-aware
// -----------------------------------------------------------------------------
// Dashboard-level widgets accept a Market and return the matching config. Per-
// symbol widgets (further below) are still symbol-keyed; locale switching for
// those lands with i18n in P3.
// =============================================================================

const localeForMarket = (market: Market) => (market === 'TW' ? 'zh_TW' : 'en');

const MARKET_OVERVIEW_BASE = {
    colorTheme: 'dark',
    dateRange: '12M',
    largeChartUrl: '',
    isTransparent: true,
    showFloatingTooltip: true,
    plotLineColorGrowing: '#0FEDBE',
    plotLineColorFalling: '#0FEDBE',
    gridLineColor: 'rgba(240, 243, 250, 0)',
    scaleFontColor: '#DBDBDB',
    belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
    belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
    belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
    belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)',
    support_host: 'https://www.tradingview.com',
    backgroundColor: '#141414',
    width: '100%',
    height: 600,
    showSymbolLogo: true,
    showChart: true,
};

const US_MARKET_OVERVIEW_TABS = [
    {
        title: 'Financial',
        symbols: [
            { s: 'NYSE:JPM', d: 'JPMorgan Chase' },
            { s: 'NYSE:WFC', d: 'Wells Fargo Co New' },
            { s: 'NYSE:BAC', d: 'Bank Amer Corp' },
            { s: 'NYSE:HSBC', d: 'Hsbc Hldgs Plc' },
            { s: 'NYSE:C', d: 'Citigroup Inc' },
            { s: 'NYSE:MA', d: 'Mastercard Incorporated' },
        ],
    },
    {
        title: 'Technology',
        symbols: [
            { s: 'NASDAQ:AAPL', d: 'Apple' },
            { s: 'NASDAQ:GOOGL', d: 'Alphabet' },
            { s: 'NASDAQ:MSFT', d: 'Microsoft' },
            { s: 'NASDAQ:META', d: 'Meta Platforms' },
            { s: 'NYSE:ORCL', d: 'Oracle Corp' },
            { s: 'NASDAQ:INTC', d: 'Intel Corp' },
        ],
    },
    {
        title: 'Services',
        symbols: [
            { s: 'NASDAQ:AMZN', d: 'Amazon' },
            { s: 'NYSE:BABA', d: 'Alibaba Group Hldg Ltd' },
            { s: 'NYSE:T', d: 'At&t Inc' },
            { s: 'NYSE:WMT', d: 'Walmart' },
            { s: 'NYSE:V', d: 'Visa' },
        ],
    },
];

const TW_MARKET_OVERVIEW_TABS = [
    {
        title: '半導體',
        symbols: [
            { s: 'TWSE:2330', d: '台積電' },
            { s: 'TWSE:2454', d: '聯發科' },
            { s: 'TWSE:2308', d: '台達電' },
            { s: 'TWSE:3008', d: '大立光' },
            { s: 'TWSE:2303', d: '聯電' },
            { s: 'TPEX:6488', d: '環球晶' },
        ],
    },
    {
        title: '金融',
        symbols: [
            { s: 'TWSE:2882', d: '國泰金' },
            { s: 'TWSE:2891', d: '中信金' },
            { s: 'TWSE:2886', d: '兆豐金' },
            { s: 'TWSE:2884', d: '玉山金' },
            { s: 'TWSE:2881', d: '富邦金' },
            { s: 'TWSE:2883', d: '開發金' },
        ],
    },
    {
        title: '電子',
        symbols: [
            { s: 'TWSE:2317', d: '鴻海' },
            { s: 'TWSE:2412', d: '中華電' },
            { s: 'TWSE:2382', d: '廣達' },
            { s: 'TWSE:2357', d: '華碩' },
            { s: 'TWSE:3711', d: '日月光投控' },
            { s: 'TWSE:2474', d: '可成' },
        ],
    },
    {
        title: '傳產',
        symbols: [
            { s: 'TWSE:1301', d: '台塑' },
            { s: 'TWSE:1303', d: '南亞' },
            { s: 'TWSE:2002', d: '中鋼' },
            { s: 'TWSE:1216', d: '統一' },
            { s: 'TWSE:2912', d: '統一超' },
            { s: 'TWSE:1101', d: '台泥' },
        ],
    },
];

export const MARKET_OVERVIEW_WIDGET_CONFIG = (market: Market) => ({
    ...MARKET_OVERVIEW_BASE,
    locale: localeForMarket(market),
    tabs: market === 'TW' ? TW_MARKET_OVERVIEW_TABS : US_MARKET_OVERVIEW_TABS,
});

// Only used for US — TW renders the self-built TwHeatmap because TradingView's
// embed widget doesn't expose a working dataSource for Taiwan equities (we
// tested 'AllTW', 'TW', 'TWSE'; all silently fall back or render empty).
export const HEATMAP_WIDGET_CONFIG = (market: Market) => ({
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: localeForMarket(market),
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
});

export const TOP_STORIES_WIDGET_CONFIG = (market: Market) => ({
    displayMode: 'regular',
    feedMode: 'market',
    colorTheme: 'dark',
    isTransparent: true,
    locale: localeForMarket(market),
    market: 'stock',
    width: '100%',
    height: '600',
});

const MARKET_DATA_BASE = {
    title: 'Stocks',
    width: '100%',
    height: 600,
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#0F0F0F',
};

const US_MARKET_DATA_GROUPS = [
    {
        name: 'Financial',
        symbols: [
            { name: 'NYSE:JPM', displayName: 'JPMorgan Chase' },
            { name: 'NYSE:WFC', displayName: 'Wells Fargo Co New' },
            { name: 'NYSE:BAC', displayName: 'Bank Amer Corp' },
            { name: 'NYSE:HSBC', displayName: 'Hsbc Hldgs Plc' },
            { name: 'NYSE:C', displayName: 'Citigroup Inc' },
            { name: 'NYSE:MA', displayName: 'Mastercard Incorporated' },
        ],
    },
    {
        name: 'Technology',
        symbols: [
            { name: 'NASDAQ:AAPL', displayName: 'Apple' },
            { name: 'NASDAQ:GOOGL', displayName: 'Alphabet' },
            { name: 'NASDAQ:MSFT', displayName: 'Microsoft' },
            { name: 'NASDAQ:META', displayName: 'Meta Platforms' },
            { name: 'NYSE:ORCL', displayName: 'Oracle Corp' },
            { name: 'NASDAQ:INTC', displayName: 'Intel Corp' },
        ],
    },
    {
        name: 'Services',
        symbols: [
            { name: 'NASDAQ:AMZN', displayName: 'Amazon' },
            { name: 'NYSE:BABA', displayName: 'Alibaba Group Hldg Ltd' },
            { name: 'NYSE:T', displayName: 'At&t Inc' },
            { name: 'NYSE:WMT', displayName: 'Walmart' },
            { name: 'NYSE:V', displayName: 'Visa' },
        ],
    },
];

const TW_MARKET_DATA_GROUPS = [
    {
        name: '半導體',
        symbols: [
            { name: 'TWSE:2330', displayName: '台積電' },
            { name: 'TWSE:2454', displayName: '聯發科' },
            { name: 'TWSE:2308', displayName: '台達電' },
            { name: 'TWSE:3008', displayName: '大立光' },
            { name: 'TWSE:2303', displayName: '聯電' },
        ],
    },
    {
        name: '金融',
        symbols: [
            { name: 'TWSE:2882', displayName: '國泰金' },
            { name: 'TWSE:2891', displayName: '中信金' },
            { name: 'TWSE:2886', displayName: '兆豐金' },
            { name: 'TWSE:2884', displayName: '玉山金' },
            { name: 'TWSE:2881', displayName: '富邦金' },
        ],
    },
    {
        name: '電子',
        symbols: [
            { name: 'TWSE:2317', displayName: '鴻海' },
            { name: 'TWSE:2412', displayName: '中華電' },
            { name: 'TWSE:2382', displayName: '廣達' },
            { name: 'TWSE:2357', displayName: '華碩' },
            { name: 'TWSE:3711', displayName: '日月光投控' },
        ],
    },
    {
        name: '傳產',
        symbols: [
            { name: 'TWSE:1301', displayName: '台塑' },
            { name: 'TWSE:1303', displayName: '南亞' },
            { name: 'TWSE:2002', displayName: '中鋼' },
            { name: 'TWSE:1216', displayName: '統一' },
            { name: 'TWSE:1101', displayName: '台泥' },
        ],
    },
];

export const MARKET_DATA_WIDGET_CONFIG = (market: Market) => ({
    ...MARKET_DATA_BASE,
    locale: localeForMarket(market),
    symbolsGroups: market === 'TW' ? TW_MARKET_DATA_GROUPS : US_MARKET_DATA_GROUPS,
});

// =============================================================================
// Per-symbol widgets (locale stays 'en' until P3 i18n adoption)
// =============================================================================

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    width: '100%',
    height: 170,
});

export const CANDLE_CHART_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'en',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const BASELINE_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'en',
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const TECHNICAL_ANALYSIS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

// =============================================================================
// Popular symbol seed lists for the search command's empty-state.
// =============================================================================

export const POPULAR_US_SYMBOLS = [
    // Tech Giants (the big technology companies)
    'AAPL',
    'MSFT',
    'GOOGL',
    'AMZN',
    'TSLA',
    'META',
    'NVDA',
    'NFLX',
    'ORCL',
    'CRM',

    // Growing Tech Companies
    'ADBE',
    'INTC',
    'AMD',
    'PYPL',
    'UBER',
    'ZOOM',
    'SPOT',
    'SQ',
    'SHOP',
    'ROKU',

    // Newer Tech Companies
    'SNOW',
    'PLTR',
    'COIN',
    'RBLX',
    'DDOG',
    'CRWD',
    'NET',
    'OKTA',
    'TWLO',
    'ZM',

    // Consumer & Delivery Apps
    'DOCU',
    'PTON',
    'PINS',
    'SNAP',
    'LYFT',
    'DASH',
    'ABNB',
    'RIVN',
    'LCID',
    'NIO',

    // International Companies
    'XPEV',
    'LI',
    'BABA',
    'JD',
    'PDD',
    'TME',
    'BILI',
    'DIDI',
    'GRAB',
    'SE',
];

export const POPULAR_TW_SYMBOLS = [
    '2330.TW', // 台積電
    '2317.TW', // 鴻海
    '2454.TW', // 聯發科
    '2308.TW', // 台達電
    '2412.TW', // 中華電
    '2882.TW', // 國泰金
    '2891.TW', // 中信金
    '2886.TW', // 兆豐金
    '1301.TW', // 台塑
    '1303.TW', // 南亞
    '1216.TW', // 統一
    '2002.TW', // 中鋼
    '3008.TW', // 大立光
    '3711.TW', // 日月光投控
    '2382.TW', // 廣達
    '2303.TW', // 聯電
    '2884.TW', // 玉山金
    '2881.TW', // 富邦金
    '2357.TW', // 華碩
    '1101.TW', // 台泥
];

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">No market news available today. Please check back tomorrow.</p>';

export const WATCHLIST_TABLE_HEADER = [
    'Company',
    'Symbol',
    'Price',
    'Change',
    'Market Cap',
    'P/E Ratio',
    'Alert',
    'Action',
];
