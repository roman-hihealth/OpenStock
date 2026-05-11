import 'server-only';
import { cache } from 'react';
import { fetchFinMind } from './finmind';
import { getCustomSector } from '@/lib/market/tw-sector-taxonomy';
import {
    getTwseDailySnapshot,
    getTwseRealtimeQuotes,
    getTpexDailySnapshot,
    type TwseDailyRow,
    type TpexDailyRow,
    type TwseQuote,
} from './twse';

type FinMindStockInfoRow = {
    industry_category: string;
    stock_id: string;
    stock_name: string;
    type: string;          // 'twse' | 'tpex' | 'emerging' | etf-codes
    date?: string;
};

export type HeatmapStock = {
    id: string;
    name: string;
    sector: string;
    value: number;          // today's NT$ trade value — drives block size
    changePct: number;      // % change vs prev close — drives color
};

export type HeatmapDataset = {
    sectors: { name: string; stocks: HeatmapStock[] }[];
    asOf: string;           // ISO date of the snapshot
};

// FinMind TaiwanStockInfo is a historical snapshot table; collapse to one row
// per stock_id, freshest wins.
const getUniverseById = cache(async (): Promise<Map<string, FinMindStockInfoRow>> => {
    const all = await fetchFinMind<FinMindStockInfoRow>('TaiwanStockInfo', {}, 86400);
    const byId = new Map<string, FinMindStockInfoRow>();
    for (const row of all) {
        const existing = byId.get(row.stock_id);
        if (!existing || (row.date ?? '') > (existing.date ?? '')) {
            byId.set(row.stock_id, row);
        }
    }
    return byId;
});

function rocDateToIso(rocDate: string): string {
    if (!rocDate || rocDate.length < 7) return '';
    const yearPart = rocDate.slice(0, -4);
    const tail = rocDate.slice(-4);
    const year = parseInt(yearPart, 10) + 1911;
    return `${year}-${tail.slice(0, 2)}-${tail.slice(2, 4)}`;
}

// Fallback path: TWSE STOCK_DAY_ALL + TPEX daily close quotes.
// Both update after market close; during trading hours shows previous session.
// Each source is fetched independently so a single failure doesn't kill both.
async function buildFromDailySnapshot(
    universe: Map<string, FinMindStockInfoRow>
): Promise<HeatmapDataset> {
    const stocks: HeatmapStock[] = [];
    let asOf = '';

    // TWSE — openapi.twse.com.tw
    try {
        const snapshot = await getTwseDailySnapshot(900);
        for (const row of snapshot) {
            const tradeValue = parseFloat(row.TradeValue || '0');
            if (!Number.isFinite(tradeValue) || tradeValue <= 0) continue;
            const close = parseFloat(row.ClosingPrice || '0');
            const change = parseFloat(row.Change || '0');
            if (!Number.isFinite(close) || close <= 0) continue;
            const prevClose = close - change;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
            const info = universe.get(row.Code);
            stocks.push({
                id: row.Code,
                name: row.Name,
                sector: getCustomSector(row.Code) ?? info?.industry_category ?? '其他',
                value: tradeValue,
                changePct,
            });
        }
        if (snapshot[0]?.Date) asOf = rocDateToIso(snapshot[0].Date);
    } catch (e) {
        console.error('[tw-heatmap] STOCK_DAY_ALL fallback failed:', e);
    }

    // TPEX — www.tpex.org.tw (covers OTC stocks missing from STOCK_DAY_ALL)
    try {
        const tpexSnapshot = await getTpexDailySnapshot(900);
        for (const row of tpexSnapshot) {
            // Filter to known universe to exclude warrants, derivatives, etc.
            if (!universe.has(row.SecuritiesCompanyCode)) continue;
            const tradeValue = parseFloat(row.TransactionAmount || '0');
            if (!Number.isFinite(tradeValue) || tradeValue <= 0) continue;
            const close = parseFloat(row.Close || '0');
            const change = parseFloat(row.Change.trim() || '0');
            if (!Number.isFinite(close) || close <= 0) continue;
            const prevClose = close - change;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
            const info = universe.get(row.SecuritiesCompanyCode);
            stocks.push({
                id: row.SecuritiesCompanyCode,
                name: row.CompanyName,
                sector: getCustomSector(row.SecuritiesCompanyCode) ?? info?.industry_category ?? '其他',
                value: tradeValue,
                changePct,
            });
        }
        if (!asOf && tpexSnapshot[0]?.Date) asOf = rocDateToIso(tpexSnapshot[0].Date);
    } catch (e) {
        console.error('[tw-heatmap] TPEX daily fallback failed:', e);
    }

    if (stocks.length === 0) return { sectors: [], asOf: '' };
    return {
        sectors: groupBySector(stocks),
        asOf,
    };
}

function groupBySector(stocks: HeatmapStock[]): { name: string; stocks: HeatmapStock[] }[] {
    const bySector = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
        const list = bySector.get(s.sector) ?? [];
        list.push(s);
        bySector.set(s.sector, list);
    }
    return Array.from(bySector.entries())
        .map(([name, list]) => ({
            name,
            stocks: list.sort((a, b) => b.value - a.value),
            total: list.reduce((sum, s) => sum + s.value, 0),
        }))
        .sort((a, b) => b.total - a.total)
        .map(({ name, stocks }) => ({ name, stocks }));
}

export const getTwHeatmapDataset = cache(async (): Promise<HeatmapDataset> => {
    let universe = new Map<string, FinMindStockInfoRow>();
    try {
        universe = await getUniverseById();
    } catch (e) {
        console.error('[tw-heatmap] universe fetch failed:', e);
        return { sectors: [], asOf: '' };
    }

    // --- Primary: TWSE MIS (chunked, covers TSE + OTC) ---
    const allSymbols: string[] = [];
    for (const row of universe.values()) {
        if (row.type === 'twse') allSymbols.push(`${row.stock_id}.TW`);
        else if (row.type === 'tpex') allSymbols.push(`${row.stock_id}.TWO`);
    }

    let quotes: TwseQuote[] = [];
    try {
        quotes = await getTwseRealtimeQuotes(allSymbols);
    } catch (e) {
        console.error('[tw-heatmap] MIS fetch failed, falling back to daily:', e);
        return buildFromDailySnapshot(universe);
    }

    if (quotes.length < allSymbols.length * 0.25) {
        console.warn(
            `[tw-heatmap] MIS returned ${quotes.length}/${allSymbols.length}; using daily fallback`
        );
        return buildFromDailySnapshot(universe);
    }

    const stocks: HeatmapStock[] = [];
    for (const q of quotes) {
        const tradeValue = q.volume * q.price * 1000;
        if (!Number.isFinite(tradeValue) || tradeValue <= 0) continue;
        const info = universe.get(q.stockId);
        const sector = getCustomSector(q.stockId) ?? info?.industry_category ?? '其他';
        stocks.push({
            id: q.stockId,
            name: q.name || info?.stock_name || q.stockId,
            sector,
            value: tradeValue,
            changePct: q.changePercent,
        });
    }

    return {
        sectors: groupBySector(stocks),
        asOf: new Date().toISOString().split('T')[0],
    };
});
