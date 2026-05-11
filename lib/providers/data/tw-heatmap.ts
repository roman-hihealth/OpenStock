import 'server-only';
import { cache } from 'react';
import { fetchFinMind } from './finmind';
import { getCustomSector } from '@/lib/market/tw-sector-taxonomy';
import {
    getTwseDailySnapshot,
    getTpexDailySnapshot,
    getTwseRealtimeQuotes,
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

    // ── Step 1: daily snapshots as base layer (guaranteed full coverage) ──────
    // TWSE STOCK_DAY_ALL + TPEX daily fetched in parallel. During trading hours
    // these reflect the previous session; after close they reflect today's.
    type BaseEntry = { name: string; changePct: number; tradeValue: number };
    const baseMap = new Map<string, BaseEntry>();
    let asOf = '';

    const [twseResult, tpexResult] = await Promise.allSettled([
        getTwseDailySnapshot(900),
        getTpexDailySnapshot(900),
    ]);

    if (twseResult.status === 'fulfilled') {
        for (const row of twseResult.value) {
            const tradeValue = parseFloat(row.TradeValue || '0');
            const close = parseFloat(row.ClosingPrice || '0');
            const change = parseFloat(row.Change || '0');
            if (!Number.isFinite(tradeValue) || tradeValue <= 0) continue;
            if (!Number.isFinite(close) || close <= 0) continue;
            const prevClose = close - change;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
            baseMap.set(row.Code, { name: row.Name, changePct, tradeValue });
        }
        if (twseResult.value[0]?.Date) asOf = rocDateToIso(twseResult.value[0].Date);
    } else {
        console.error('[tw-heatmap] STOCK_DAY_ALL failed:', twseResult.reason);
    }

    if (tpexResult.status === 'fulfilled') {
        for (const row of tpexResult.value) {
            if (!universe.has(row.SecuritiesCompanyCode)) continue; // skip warrants/derivatives
            const tradeValue = parseFloat(row.TransactionAmount || '0');
            const close = parseFloat(row.Close || '0');
            const change = parseFloat(row.Change.trim() || '0');
            if (!Number.isFinite(tradeValue) || tradeValue <= 0) continue;
            if (!Number.isFinite(close) || close <= 0) continue;
            const prevClose = close - change;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
            baseMap.set(row.SecuritiesCompanyCode, { name: row.CompanyName, changePct, tradeValue });
        }
        if (!asOf && tpexResult.value[0]?.Date) asOf = rocDateToIso(tpexResult.value[0].Date);
    } else {
        console.error('[tw-heatmap] TPEX daily failed:', tpexResult.reason);
    }

    if (baseMap.size === 0) return { sectors: [], asOf: '' };

    // ── Step 2: overlay today's live changePct from MIS (best-effort) ────────
    // MIS batch returns z="-" for many stocks; only update when isLive=true.
    // Partial success is fine — daily data fills in the rest.
    const allSymbols: string[] = [];
    for (const row of universe.values()) {
        if (row.type === 'twse') allSymbols.push(`${row.stock_id}.TW`);
        else if (row.type === 'tpex') allSymbols.push(`${row.stock_id}.TWO`);
    }

    let hasLiveData = false;
    try {
        const quotes = await getTwseRealtimeQuotes(allSymbols);
        for (const q of quotes) {
            if (q.isLive && baseMap.has(q.stockId)) {
                const base = baseMap.get(q.stockId)!;
                baseMap.set(q.stockId, { ...base, changePct: q.changePercent });
                hasLiveData = true;
            }
        }
    } catch (e) {
        console.warn('[tw-heatmap] MIS overlay failed, showing daily changePct:', e);
    }

    // ── Step 3: build HeatmapStock list ──────────────────────────────────────
    const stocks: HeatmapStock[] = [];
    for (const [stockId, base] of baseMap) {
        const info = universe.get(stockId);
        const sector = getCustomSector(stockId) ?? info?.industry_category ?? '其他';
        stocks.push({
            id: stockId,
            name: base.name || info?.stock_name || stockId,
            sector,
            value: base.tradeValue,
            changePct: base.changePct,
        });
    }

    return {
        sectors: groupBySector(stocks),
        asOf: hasLiveData ? new Date().toISOString().split('T')[0] : asOf,
    };
});
