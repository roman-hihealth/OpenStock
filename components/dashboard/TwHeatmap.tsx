import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
import {
    getTwHeatmapDataset,
    type HeatmapStock,
} from '@/lib/providers/data/tw-heatmap';

const VIEWBOX_W = 1200;
const VIEWBOX_H = 600;
const SECTOR_HEADER = 16;

// Taiwan market convention: 紅漲綠跌 (positive = red, negative = green) —
// opposite of US/Western markets. Saturation tops out at ±5% so day-to-day
// moves stay visually distinct without blowing out against the rare ±10%
// limit moves.
function bgFromChange(pct: number): string {
    const clamped = Math.max(-5, Math.min(5, pct));
    if (clamped > 0.1) {
        const intensity = clamped / 5;
        return `rgba(239, 68, 68, ${0.35 + intensity * 0.5})`;
    }
    if (clamped < -0.1) {
        const intensity = -clamped / 5;
        return `rgba(34, 197, 94, ${0.35 + intensity * 0.5})`;
    }
    return 'rgba(75, 85, 99, 0.55)';
}

type StockNode = { kind: 'stock' } & HeatmapStock;
type SectorNode = { kind: 'sector'; name: string; children: StockNode[] };
type RootNode = { kind: 'root'; children: SectorNode[] };
type TreeNode = RootNode | SectorNode | StockNode;

export default async function TwHeatmap() {
    const dataset = await getTwHeatmapDataset();

    if (dataset.sectors.length === 0) {
        return (
            <div
                className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 flex items-center justify-center"
                style={{ height: 600 }}
            >
                <span className="text-gray-500 text-sm">無法取得熱圖資料</span>
            </div>
        );
    }

    const root = hierarchy<TreeNode>(
        {
            kind: 'root',
            children: dataset.sectors.map((s) => ({
                kind: 'sector' as const,
                name: s.name,
                children: s.stocks.map((st) => ({ kind: 'stock' as const, ...st })),
            })),
        },
        (d) => ('children' in d ? d.children : undefined)
    )
        .sum((d) => (d.kind === 'stock' ? d.value : 0))
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const layout = treemap<TreeNode>()
        .size([VIEWBOX_W, VIEWBOX_H])
        .paddingOuter(2)
        .paddingTop(SECTOR_HEADER)
        .paddingInner(1)
        .tile(treemapSquarify)(root);

    return (
        <div
            className="bg-gray-900/30 rounded-lg border border-gray-800 p-4 overflow-hidden"
            style={{ height: 600 }}
        >
            <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-lg font-semibold text-white">台股熱圖</h2>
                <span className="text-xs text-gray-500">
                    {dataset.asOf || ''} · 依產業分組 / 成交金額決定面積 / 漲跌幅決定顏色
                </span>
            </div>

            <svg
                viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
                preserveAspectRatio="none"
                width="100%"
                style={{ height: 'calc(100% - 32px)' }}
                suppressHydrationWarning
            >
                {layout.children?.map((sectorNode) => {
                    const sectorData = sectorNode.data as SectorNode;
                    const sx = sectorNode.x0;
                    const sy = sectorNode.y0;
                    const sw = sectorNode.x1 - sectorNode.x0;
                    return (
                        <g key={sectorData.name}>
                            <rect
                                x={sx}
                                y={sy}
                                width={sw}
                                height={SECTOR_HEADER - 1}
                                fill="rgba(15, 15, 15, 0.92)"
                            />
                            {sw > 60 && (
                                <text
                                    x={sx + 4}
                                    y={sy + SECTOR_HEADER - 4}
                                    fill="#cbd5e1"
                                    fontSize="11"
                                    fontWeight={600}
                                >
                                    {sectorData.name}
                                </text>
                            )}

                            {sectorNode.children?.map((stockNode) => {
                                const stock = stockNode.data as StockNode;
                                const x = stockNode.x0;
                                const y = stockNode.y0;
                                const w = stockNode.x1 - stockNode.x0;
                                const h = stockNode.y1 - stockNode.y0;
                                const showId = w > 26 && h > 18;
                                const showName = w > 60 && h > 36;
                                const showChg = w > 50 && h > 28;
                                return (
                                    <a
                                        key={stock.id}
                                        href={`/stocks/${stock.id}.TW`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <rect
                                            x={x}
                                            y={y}
                                            width={w}
                                            height={h}
                                            fill={bgFromChange(stock.changePct)}
                                            stroke="rgba(0,0,0,0.45)"
                                            strokeWidth="0.5"
                                        />
                                        <title>{`${stock.id} ${stock.name} · ${stock.changePct >= 0 ? '+' : ''}${stock.changePct.toFixed(2)}%`}</title>
                                        {showId && (
                                            <text
                                                x={x + w / 2}
                                                y={y + h / 2 - (showName ? 6 : showChg ? 4 : 0)}
                                                textAnchor="middle"
                                                fill="white"
                                                fontSize="11"
                                                fontWeight={600}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {stock.id}
                                            </text>
                                        )}
                                        {showName && (
                                            <text
                                                x={x + w / 2}
                                                y={y + h / 2 + 6}
                                                textAnchor="middle"
                                                fill="rgba(255,255,255,0.85)"
                                                fontSize="9"
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {stock.name}
                                            </text>
                                        )}
                                        {showChg && (
                                            <text
                                                x={x + w / 2}
                                                y={
                                                    y +
                                                    h / 2 +
                                                    (showName ? 18 : 9)
                                                }
                                                textAnchor="middle"
                                                fill="white"
                                                fontSize="9"
                                                fontWeight={500}
                                                style={{ pointerEvents: 'none' }}
                                            >
                                                {stock.changePct >= 0 ? '+' : ''}
                                                {stock.changePct.toFixed(2)}%
                                            </text>
                                        )}
                                    </a>
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
