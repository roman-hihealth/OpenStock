import { getTwFinancials, type TwQuarterFinancials } from '@/lib/providers/data/tw-financials';
import { cn } from '@/lib/utils';

// Format raw NTD into compact units. Inputs are absolute amounts (not millions).
function formatTwd(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
    return `${sign}${abs.toFixed(0)}`;
}

function formatEps(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) return '—';
    return value.toFixed(2);
}

function formatPct(numerator: number | undefined, denominator: number | undefined): string {
    if (numerator === undefined || denominator === undefined || !denominator) return '—';
    return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

type Row = {
    label: string;
    accessor: (q: TwQuarterFinancials) => string;
    emphasis?: boolean;
};

const ROWS: Row[] = [
    { label: '營收 Revenue', accessor: (q) => formatTwd(q.revenue), emphasis: true },
    { label: '毛利 Gross Profit', accessor: (q) => formatTwd(q.grossProfit) },
    { label: '毛利率 GM%', accessor: (q) => formatPct(q.grossProfit, q.revenue) },
    { label: '營業利益 Op Income', accessor: (q) => formatTwd(q.operatingIncome) },
    { label: '營業利益率 OPM%', accessor: (q) => formatPct(q.operatingIncome, q.revenue) },
    { label: '稅後淨利 Net Income', accessor: (q) => formatTwd(q.netIncome), emphasis: true },
    { label: '淨利率 NPM%', accessor: (q) => formatPct(q.netIncome, q.revenue) },
    { label: 'EPS (NT$)', accessor: (q) => formatEps(q.eps), emphasis: true },
    { label: '營業現金流 OCF', accessor: (q) => formatTwd(q.operatingCashFlow) },
    { label: '投資現金流 ICF', accessor: (q) => formatTwd(q.investingCashFlow) },
    { label: '融資現金流 FCF', accessor: (q) => formatTwd(q.financingCashFlow) },
    { label: '現金 Cash', accessor: (q) => formatTwd(q.cashAndEquivalents) },
];

export default async function TwFinancials({ symbol }: { symbol: string }) {
    const quarters = (await getTwFinancials(symbol)).slice(0, 4);

    if (quarters.length === 0) {
        return (
            <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">財務數據</h2>
                <p className="text-sm text-gray-500">目前無法取得 {symbol} 的財報資料。</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">財務數據（最近 {quarters.length} 季）</h2>
                <span className="text-xs text-gray-500">FinMind</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-800 text-gray-400">
                            <th className="text-left py-2 pr-3 font-medium">項目</th>
                            {quarters.map((q) => (
                                <th key={q.period} className="text-right py-2 px-3 font-medium">
                                    {q.period}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr key={row.label} className="border-b border-gray-800/50">
                                <td
                                    className={cn(
                                        'py-2 pr-3 text-gray-400',
                                        row.emphasis && 'text-gray-200 font-medium'
                                    )}
                                >
                                    {row.label}
                                </td>
                                {quarters.map((q) => (
                                    <td
                                        key={q.period + row.label}
                                        className={cn(
                                            'text-right py-2 px-3 font-mono tabular-nums text-gray-300',
                                            row.emphasis && 'text-white font-semibold'
                                        )}
                                    >
                                        {row.accessor(q)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-3 text-xs text-gray-500">
                * 單位：T=兆、B=十億、M=百萬、K=千；EPS 為元/股
                <br />
                * 損益項目（營收 / 毛利 / 淨利 / EPS）為當季單獨數字；現金流項目為當年度累計值
            </p>
        </div>
    );
}
