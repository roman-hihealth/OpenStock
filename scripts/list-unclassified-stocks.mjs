/**
 * 列出所有「尚未被自訂對照表覆蓋」的台股，依 FinMind industry_category 分組輸出。
 * 執行：node scripts/list-unclassified-stocks.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// 讀 .env 取 token
const envPath = resolve(process.cwd(), '.env');
const envVars = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => {
            const idx = l.indexOf('=');
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        })
);
const TOKEN = envVars.FINMIND_TOKEN ?? '';

// 自訂對照表（複製自 tw-sector-taxonomy.ts，避免 server-only 限制）
const CUSTOM_IDS = new Set([
    '2454','3034','2379','3443','6415','2458','3545','8081','6138','6462',
    '3035','6643','3529',
    '2330','2303','6770','5347','3105','8086',
    '3711','2325','2441','6239','8150','2449','3264',
    '3702','3036','3661',
    '4702','2344','2337','8299','6286','3260','4919',
    '2448','3698','2455','3707','3016','3081',
    '2481','5425','8261','8255',
    '3680','3413','3583','2464','6238','2360',
    '5234','2404','6590','6139',
    '6488','6182','5483','2338','1711','1717','1560','5434','1785',
    '1815','1802','2383','6213','8039','1303',
    '3037','3044','2355','4958','6269','6153','8046','3189',
    '2327','2492','2437','2456','2472',
    '6223','6510','6515',
    '3017','3324','2421','3338',
    '3533','3665',
    '2308','2301',
    '2382','3231','2356','2317','6669','2376',
    '8210','2354',
    '2345','3380','3596',
    '3363',
]);

// FinMind 裡我們關注的產業類別（半導體供應鏈相關）
const TARGET_CATEGORIES = new Set([
    '半導體業',
    '半導體',
    '電子零組件業',
    '電子通路業',
    '電腦及週邊設備業',
    '光電業',
    '通信網路業',
    '其他電子業',
    '電子',
]);

async function main() {
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInfo&token=${TOKEN}`;
    console.log('Fetching TaiwanStockInfo from FinMind…');
    const res = await fetch(url);
    const json = await res.json();

    if (json.status !== 200) {
        console.error('FinMind error:', json.msg);
        process.exit(1);
    }

    // 去重：每個 stock_id 保留最新一筆
    const byId = new Map();
    for (const row of json.data) {
        const existing = byId.get(row.stock_id);
        if (!existing || (row.date ?? '') > (existing.date ?? '')) {
            byId.set(row.stock_id, row);
        }
    }

    // 只看 twse / tpex，排除興櫃與 ETF
    const listed = Array.from(byId.values()).filter(
        r => r.type === 'twse' || r.type === 'tpex'
    );

    // 未在自訂對照表裡的
    const unclassified = listed.filter(r => !CUSTOM_IDS.has(r.stock_id));

    // 依 industry_category 分組
    const grouped = new Map();
    for (const r of unclassified) {
        const cat = r.industry_category || '（無分類）';
        const list = grouped.get(cat) ?? [];
        list.push(r);
        grouped.set(cat, list);
    }

    // 排序：TARGET_CATEGORIES 優先，其餘依名稱排序
    const sorted = Array.from(grouped.entries()).sort(([a], [b]) => {
        const aTarget = TARGET_CATEGORIES.has(a);
        const bTarget = TARGET_CATEGORIES.has(b);
        if (aTarget && !bTarget) return -1;
        if (!aTarget && bTarget) return 1;
        return a.localeCompare(b, 'zh-TW');
    });

    console.log(`\n共 ${unclassified.length} 支股票尚未分類（${listed.length} 支上市櫃總計）\n`);
    console.log('═'.repeat(60));

    for (const [cat, stocks] of sorted) {
        const isTarget = TARGET_CATEGORIES.has(cat);
        const prefix = isTarget ? '🔴 ' : '   ';
        console.log(`\n${prefix}${cat} (${stocks.length})`);
        for (const s of stocks.sort((a, b) => a.stock_id.localeCompare(b.stock_id))) {
            console.log(`    ${s.stock_id}\t${s.stock_name}`);
        }
    }

    console.log('\n═'.repeat(60));
    console.log('🔴 = 與半導體/AI 供應鏈相關的 FinMind 分類');
}

main().catch(console.error);
