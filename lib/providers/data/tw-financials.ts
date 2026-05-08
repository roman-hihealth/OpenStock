import 'server-only';
import { cache } from 'react';
import { fetchFinMind } from './finmind';

type FinMindStatementRow = {
    date: string;       // 'YYYY-MM-DD'
    stock_id: string;
    type: string;       // FinMind line item code
    value: number;
    origin_name: string;
};

export type TwQuarterFinancials = {
    period: string;             // e.g. '2025-Q3'
    date: string;               // ISO date '2025-09-30'
    revenue?: number;
    grossProfit?: number;
    operatingIncome?: number;
    netIncome?: number;
    eps?: number;
    operatingCashFlow?: number;
    investingCashFlow?: number;
    financingCashFlow?: number;
    cashAndEquivalents?: number;
};

function stripTwSuffix(symbol: string): string {
    const upper = symbol.trim().toUpperCase();
    if (upper.endsWith('.TWO')) return upper.slice(0, -4);
    if (upper.endsWith('.TW')) return upper.slice(0, -3);
    return upper;
}

function quarterLabel(date: string): string {
    // "2025-09-30" → "2025-Q3"
    const [yyyy, mm] = date.split('-');
    const m = parseInt(mm, 10);
    const q = Math.ceil(m / 3);
    return `${yyyy}-Q${q}`;
}

// Pull the freshest entry for a given (date, type). FinMind occasionally emits
// duplicate rows for the same metric/quarter when statements are amended.
function pickLatest(
    rows: FinMindStatementRow[],
    type: string,
    date: string
): number | undefined {
    for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        if (r.date === date && r.type === type) return r.value;
    }
    return undefined;
}

export const getTwFinancials = cache(async (symbol: string): Promise<TwQuarterFinancials[]> => {
    const id = stripTwSuffix(symbol);
    if (!id) return [];

    // Pull last ~2 years so we have 6-8 quarters to choose from.
    const start = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

    try {
        const [income, cashflow, balance] = await Promise.all([
            fetchFinMind<FinMindStatementRow>(
                'TaiwanStockFinancialStatements',
                { data_id: id, start_date: start },
                86400
            ).catch((e) => {
                console.error('[tw-financials] income fetch failed:', e);
                return [] as FinMindStatementRow[];
            }),
            fetchFinMind<FinMindStatementRow>(
                'TaiwanStockCashFlowsStatement',
                { data_id: id, start_date: start },
                86400
            ).catch((e) => {
                console.error('[tw-financials] cashflow fetch failed:', e);
                return [] as FinMindStatementRow[];
            }),
            fetchFinMind<FinMindStatementRow>(
                'TaiwanStockBalanceSheet',
                { data_id: id, start_date: start },
                86400
            ).catch((e) => {
                console.error('[tw-financials] balance fetch failed:', e);
                return [] as FinMindStatementRow[];
            }),
        ]);

        // Collect distinct quarter dates across all three statements, newest first.
        const dateSet = new Set<string>();
        for (const r of income) dateSet.add(r.date);
        for (const r of cashflow) dateSet.add(r.date);
        for (const r of balance) dateSet.add(r.date);
        const dates = Array.from(dateSet).sort().reverse().slice(0, 6);

        return dates.map((date) => ({
            period: quarterLabel(date),
            date,
            revenue: pickLatest(income, 'Revenue', date),
            grossProfit: pickLatest(income, 'GrossProfit', date),
            operatingIncome: pickLatest(income, 'OperatingIncome', date),
            netIncome: pickLatest(income, 'IncomeAfterTaxes', date),
            eps: pickLatest(income, 'EPS', date),
            operatingCashFlow:
                pickLatest(cashflow, 'CashFlowsFromOperatingActivities', date) ??
                pickLatest(cashflow, 'NetCashInflowFromOperatingActivities', date),
            investingCashFlow: pickLatest(cashflow, 'CashProvidedByInvestingActivities', date),
            financingCashFlow: pickLatest(cashflow, 'CashFlowsProvidedFromFinancingActivities', date),
            cashAndEquivalents: pickLatest(balance, 'CashAndCashEquivalents', date),
        }));
    } catch (e) {
        console.error('[tw-financials] failed:', e);
        return [];
    }
});
