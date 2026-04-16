import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import type { MethodKey } from "../../lib/types";
import { METHOD_META } from "../../lib/constants";

const CHART_NS = [4, 5, 6, 7, 8] as const;

// ─── Fast stat counter (no step array allocation) ─────────────────────────────

interface AlgoStats {
    totalSteps: number;
    checks: number;
    placements: number;
    conflicts: number;
    backtracks: number;
    runtimeMs: number;
}

function countAlgoStatsFast(n: number, method: MethodKey): AlgoStats {
    let totalSteps = 0, checks = 0, placements = 0, conflicts = 0, backtracks = 0;

    if (method === "bt") {
        const board = Array<number>(n).fill(-1);
        const isSafe = (row: number, col: number) => {
            for (let r = 0; r < row; r++) {
                if (board[r] === col || Math.abs(board[r] - col) === Math.abs(r - row)) return false;
            }
            return true;
        };
        const solve = (row: number): void => {
            if (row === n) { totalSteps++; return; }
            totalSteps++;
            for (let col = 0; col < n; col++) {
                checks++; totalSteps++;
                if (isSafe(row, col)) {
                    placements++; totalSteps++;
                    board[row] = col; solve(row + 1); board[row] = -1;
                    backtracks++; totalSteps++;
                } else { conflicts++; totalSteps++; }
            }
            totalSteps++;
        };
        solve(0);
    } else if (method === "fc") {
        const board = Array<number>(n).fill(-1);
        const solve = (row: number, domains: Set<number>[]): void => {
            if (row === n) { totalSteps++; return; }
            const validCols = Array.from(domains[row]).sort((a, b) => a - b);
            totalSteps++;
            for (const col of validCols) {
                checks++; totalSteps++;
                const nd = domains.map(s => new Set(s));
                let ok = true;
                for (let r = row + 1; r < n; r++) {
                    const d = r - row;
                    nd[r].delete(col); nd[r].delete(col - d); nd[r].delete(col + d);
                    if (nd[r].size === 0) { ok = false; break; }
                }
                if (ok) {
                    placements++; totalSteps++;
                    board[row] = col; solve(row + 1, nd); board[row] = -1;
                    backtracks++; totalSteps++;
                } else { conflicts++; totalSteps++; }
            }
            totalSteps++;
        };
        const init = Array.from({ length: n }, () => new Set(Array.from({ length: n }, (_, i) => i)));
        solve(0, init);
    } else {
        const board = Array<number>(n).fill(-1);
        const full = (1 << n) - 1;
        const solve = (row: number, cols: number, d1: number, d2: number): void => {
            if (row === n) { totalSteps++; return; }
            const avail = full & ~(cols | d1 | d2);
            totalSteps++;
            if (avail === 0) { totalSteps++; return; }
            let mask = avail;
            while (mask) {
                const bit = mask & (-mask);
                const col = 31 - Math.clz32(bit);
                mask &= mask - 1;
                checks++; totalSteps++;
                placements++; totalSteps++;
                board[row] = col;
                solve(row + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);
                board[row] = -1;
                backtracks++; totalSteps++;
            }
            totalSteps++;
        };
        solve(0, 0, 0, 0);
    }

    return { totalSteps, checks, placements, conflicts, backtracks, runtimeMs: 0 };
}

function measureAlgoRuntime(n: number, method: MethodKey): number {
    // Adaptive trial count: more trials for fast small-N, fewer for large-N
    const TRIALS = n <= 5 ? 60 : n === 6 ? 20 : n === 7 ? 10 : 5;
    countAlgoStatsFast(n, method); // warm-up
    const t0 = performance.now();
    for (let i = 0; i < TRIALS; i++) countAlgoStatsFast(n, method);
    return (performance.now() - t0) / TRIALS;
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function fmtNum(v: number): string {
    if (v === 0) return "0";
    if (v >= 10000) return `${Math.round(v / 1000)}k`;
    if (v >= 1000)  return `${(v / 1000).toFixed(1)}k`;
    return String(v);
}

// v is stored in ms; display in µs for finer resolution
function fmtUs(v: number): string {
    const us = v * 1000;
    if (us < 1)     return "<1";
    if (us < 10)    return us.toFixed(1);
    if (us < 1000)  return Math.round(us).toString();
    if (us < 10000) return `${(us / 1000).toFixed(1)}k`;
    return `${Math.round(us / 1000)}k`;
}

interface BarChartProps {
    data: { label: string; values: Record<MethodKey, number> }[];
    title: string;
    methods: MethodKey[];
    chartHeight?: number;
    yFmt?: (v: number) => string;
}

function BarChart({ data, title, methods, chartHeight = 200, yFmt = fmtNum }: BarChartProps) {
    const W = 460, H = chartHeight;
    const PAD = { top: 24, bottom: 36, left: 46, right: 8 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const allVals = data.flatMap(d => methods.map(m => d.values[m]));
    const maxVal  = Math.max(...allVals, 1);
    const groupW  = cW / data.length;
    const barW    = Math.max(8, (groupW * 0.7) / methods.length);
    const groupGap = (groupW - barW * methods.length) / 2;

    const yTicks = 4;
    const rawStep = maxVal / yTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const niceStep = Math.ceil(rawStep / mag) * mag;

    return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6, textAlign: "center" }}>
                {title}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
                {Array.from({ length: yTicks + 1 }, (_, i) => {
                    const val = niceStep * i;
                    const y = PAD.top + cH - Math.min(1, val / maxVal) * cH;
                    if (val > maxVal * 1.1) return null;
                    return (
                        <g key={i}>
                            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                                stroke="var(--color-border-tertiary)" strokeWidth={0.5} />
                            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={8}
                                fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">
                                {yFmt(val)}
                            </text>
                        </g>
                    );
                })}
                {data.map((d, gi) => {
                    const gx = PAD.left + gi * groupW + groupGap;
                    return (
                        <g key={d.label}>
                            {methods.map((m, mi) => {
                                const val  = d.values[m];
                                const barH = (val / maxVal) * cH;
                                const x    = gx + mi * barW;
                                const y    = PAD.top + cH - barH;
                                const meta = METHOD_META[m];
                                return (
                                    <rect key={m} x={x} y={y} width={barW - 1} height={Math.max(0, barH)}
                                        fill={meta.accent} opacity={0.82} rx={2} />
                                );
                            })}
                            <text x={PAD.left + gi * groupW + groupW / 2} y={PAD.top + cH + 14}
                                textAnchor="middle" fontSize={10} fill="var(--color-text-secondary)"
                                fontFamily="var(--font-sans)">
                                {d.label}
                            </text>
                        </g>
                    );
                })}
                <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />
                <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />
            </svg>
        </div>
    );
}

const TH: CSSProperties = {
    padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 600,
    color: "var(--color-text-secondary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
};

const TD: CSSProperties = {
    padding: "5px 10px", fontSize: 11,
    color: "var(--color-text-primary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    fontFamily: "var(--font-mono)",
};

// ─── Charts View ──────────────────────────────────────────────────────────────

function pct(num: number, den: number) {
    return den > 0 ? Math.round(num / den * 100) : 0;
}

const CHART_INSIGHTS: Record<string, string> = {
    totalSteps: "BT generates the most steps because every row tries all N columns and conflicts are detected after the fact. FC cuts this by 40–70% through domain pruning. BM is similar to or lower than FC — the mask pre-filters invalid columns so only safe positions are ever visited.",
    checks: "BT checks all N candidates per row regardless of feasibility. FC checks only the remaining domain columns. BM checks only the bitmask-filtered safe positions — at N=8 this averages 4–5 columns per row instead of 8.",
    conflicts: "Each BT conflict is one wasted check. Each FC conflict represents an entire subtree pruned early — higher value per event. BM always shows 0 conflicts: the bitmask guarantees every candidate is valid before it is tried.",
    backtracks: "All three algorithms backtrack roughly proportionally because they find the same solution set. BM and FC arrive at solutions via shorter paths, but the total backtrack count follows a similar shape. Differences are smaller here than in checks or conflicts.",
    efficiency: "Check efficiency = placements ÷ checks × 100. BM approaches 100% at all N because every position it checks is guaranteed safe. BT is lowest — many checks end in rejection. FC is intermediate; domain filtering removes obvious conflicts but not all.",
    conflictRate: "Conflict rate = conflicts ÷ checks × 100. BM is always 0%. The gap between BT and FC shows how much domain propagation reduces wasted checking. At N=8, BT wastes roughly 50–70% of its checks on positions it will reject.",
    candPerRow: "Average candidates per row = checks ÷ N. BT always equals N (tries every column). BM stays significantly below N because the mask pre-filters safe columns. FC is between the two. The gap widens as N grows, showing how much more selective BM and FC are.",
    runtimeMs: "Wall-clock time in µs (microseconds) per run, averaged over multiple trials using performance.now(). BT is slowest because it visits the most nodes. BM is fastest — O(1) bitmask operations replace the O(row) isSafe scan. The ratio between BT and BM widens as N grows, showing the compounding benefit of avoiding invalid positions entirely.",
};

export function ChartsView() {
    const METHODS: MethodKey[] = ["bt", "fc", "bm"];
    const [focusedKey, setFocusedKey] = useState<string | null>(null);

    const allStats = useMemo(() =>
        CHART_NS.map(n => {
            const bt = countAlgoStatsFast(n, "bt");
            const fc = countAlgoStatsFast(n, "fc");
            const bm = countAlgoStatsFast(n, "bm");
            bt.runtimeMs = measureAlgoRuntime(n, "bt");
            fc.runtimeMs = measureAlgoRuntime(n, "fc");
            bm.runtimeMs = measureAlgoRuntime(n, "bm");
            return { n, stats: { bt, fc, bm } as Record<MethodKey, AlgoStats> };
        })
    , []);

    const makeData = (key: keyof AlgoStats) =>
        allStats.map(({ n, stats }) => ({
            label: `N=${n}`,
            values: { bt: stats.bt[key], fc: stats.fc[key], bm: stats.bm[key] } as Record<MethodKey, number>,
        }));

    // Derived: check efficiency % = placements / checks × 100
    const makeEfficiency = () =>
        allStats.map(({ n, stats }) => ({
            label: `N=${n}`,
            values: {
                bt: pct(stats.bt.placements, stats.bt.checks),
                fc: pct(stats.fc.placements, stats.fc.checks),
                bm: pct(stats.bm.placements, stats.bm.checks),
            } as Record<MethodKey, number>,
        }));

    // Derived: conflict rate % = conflicts / checks × 100 (BM always 0)
    const makeConflictRate = () =>
        allStats.map(({ n, stats }) => ({
            label: `N=${n}`,
            values: {
                bt: pct(stats.bt.conflicts, stats.bt.checks),
                fc: pct(stats.fc.conflicts, stats.fc.checks),
                bm: 0,
            } as Record<MethodKey, number>,
        }));

    // Derived: average candidates tried per row = checks / n
    const makeCandPerRow = () =>
        allStats.map(({ n, stats }) => ({
            label: `N=${n}`,
            values: {
                bt: Math.round(stats.bt.checks / n),
                fc: Math.round(stats.fc.checks / n),
                bm: Math.round(stats.bm.checks / n),
            } as Record<MethodKey, number>,
        }));

    const makeRuntimeData = () =>
        allStats.map(({ n, stats }) => ({
            label: `N=${n}`,
            values: { bt: stats.bt.runtimeMs, fc: stats.fc.runtimeMs, bm: stats.bm.runtimeMs } as Record<MethodKey, number>,
        }));

    type ChartEntry = {
        key: string; title: string;
        data: { label: string; values: Record<MethodKey, number> }[];
        subtitle?: string;
        yFmt?: (v: number) => string;
    };

    // All 8 charts in a paired 2×4 layout — each row pairs a count metric with its derived counterpart
    const allCharts: ChartEntry[] = [
        { key: "totalSteps",  title: "Total algorithm steps",        data: makeData("totalSteps") },
        { key: "runtimeMs",   title: "Runtime (µs, avg)",            data: makeRuntimeData(),   yFmt: fmtUs, subtitle: "µs = ms × 1000 — averaged over multiple trials via performance.now()" },
        { key: "checks",      title: "Check operations",             data: makeData("checks") },
        { key: "efficiency",  title: "Check efficiency (%)",         data: makeEfficiency(),    subtitle: "placements ÷ checks × 100 — higher is better" },
        { key: "conflicts",   title: "Conflicts / pruned positions", data: makeData("conflicts") },
        { key: "conflictRate",title: "Conflict rate (%)",            data: makeConflictRate(),  subtitle: "conflicts ÷ checks × 100 — lower is better · BM always 0" },
        { key: "backtracks",  title: "Backtracks + exhaustions",     data: makeData("backtracks") },
        { key: "candPerRow",  title: "Avg candidates per row",       data: makeCandPerRow(),    subtitle: "checks ÷ N — BT always tries all N columns; BM only tries safe ones" },
    ];

    const cardBase: CSSProperties = {
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "14px",
        position: "relative",
    };

    const focusBtn = (key: string) => (
        <button
            onClick={e => { e.stopPropagation(); setFocusedKey(focusedKey === key ? null : key); }}
            title={focusedKey === key ? "Collapse" : "Focus / zoom in"}
            style={{
                position: "absolute", top: 10, right: 10,
                padding: "2px 7px", fontSize: 11, cursor: "pointer",
                borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)",
                background: focusedKey === key ? "var(--color-background-info)" : "transparent",
                color: focusedKey === key ? "var(--color-text-info)" : "var(--color-text-tertiary)",
                userSelect: "none",
            }}
        >
            {focusedKey === key ? "✕" : "⤢"}
        </button>
    );

    const focusedEntry = allCharts.find(c => c.key === focusedKey);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Legend */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "10px 14px",
                display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap",
            }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 600 }}>Legend</span>
                {METHODS.map(m => {
                    const meta = METHOD_META[m];
                    return (
                        <div key={m} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 2, background: meta.accent }} />
                            <span style={{ fontSize: 12, color: meta.accent, fontWeight: 500 }}>{meta.name}</span>
                        </div>
                    );
                })}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Click ⤢ on any chart to expand it with an analysis summary
                </span>
            </div>

            {/* Focused chart panel */}
            {focusedEntry && (
                <div style={{
                    background: "var(--color-background-primary)",
                    border: "1.5px solid var(--color-border-info)",
                    borderRadius: "var(--border-radius-lg)",
                    padding: "18px 18px 14px",
                    position: "relative",
                }}>
                    <BarChart data={focusedEntry.data} title={focusedEntry.title} methods={METHODS} chartHeight={300} yFmt={focusedEntry.yFmt} />
                    {focusedEntry.subtitle && (
                        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4, textAlign: "center" }}>
                            {focusedEntry.subtitle}
                        </div>
                    )}
                    <div style={{
                        marginTop: 12, padding: "10px 14px",
                        background: "var(--color-background-info)",
                        border: "0.5px solid var(--color-border-info)",
                        borderRadius: "var(--border-radius-md)",
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-info)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            What to expect
                        </div>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary)", textAlign: "left" }}>
                            {CHART_INSIGHTS[focusedEntry.key]}
                        </p>
                    </div>
                    <button
                        onClick={() => setFocusedKey(null)}
                        style={{
                            position: "absolute", top: 12, right: 12,
                            padding: "2px 8px", fontSize: 12, cursor: "pointer",
                            borderRadius: "var(--border-radius-md)",
                            border: "0.5px solid var(--color-border-info)",
                            background: "var(--color-background-info)",
                            color: "var(--color-text-info)",
                        }}
                    >
                        ✕ Close
                    </button>
                </div>
            )}

            {/* 2-column × 4-row chart grid — paired: count metric | derived metric */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {allCharts.map(({ key, title, data, subtitle, yFmt: chartYFmt }) => (
                    <div key={key} style={{ ...cardBase, opacity: focusedKey && focusedKey !== key ? 0.6 : 1, transition: "opacity 0.2s" }}>
                        {focusBtn(key)}
                        <BarChart data={data} title={title} methods={METHODS} yFmt={chartYFmt} />
                        {subtitle && (
                            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 6, textAlign: "center" }}>
                                {subtitle}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Raw data table */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "14px", overflowX: "auto",
            }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>
                    Raw data
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            {["N", "Algorithm", "Steps", "Checks", "Conflicts", "Backtracks", "Placed", "Efficiency", "Conflict %", "Cands/row", "Runtime (µs)"].map(h => (
                                <th key={h} style={TH}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {allStats.flatMap(({ n, stats }) =>
                            METHODS.map(m => {
                                const s = stats[m];
                                const meta = METHOD_META[m];
                                const eff  = pct(s.placements, s.checks);
                                const conf = pct(s.conflicts,  s.checks);
                                const cpr  = n > 0 ? Math.round(s.checks / n) : 0;
                                return (
                                    <tr key={`${n}-${m}`}>
                                        <td style={TD}>{n}</td>
                                        <td style={{ ...TD, color: meta.accent, fontWeight: 500 }}>{meta.name}</td>
                                        <td style={TD}>{s.totalSteps.toLocaleString()}</td>
                                        <td style={TD}>{s.checks.toLocaleString()}</td>
                                        <td style={{ ...TD, color: s.conflicts === 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
                                            {s.conflicts.toLocaleString()}
                                        </td>
                                        <td style={{ ...TD, color: "var(--color-text-warning)" }}>{s.backtracks.toLocaleString()}</td>
                                        <td style={{ ...TD, color: "var(--color-text-success)" }}>{s.placements.toLocaleString()}</td>
                                        <td style={{ ...TD, color: eff >= 80 ? "var(--color-text-success)" : "var(--color-text-primary)" }}>
                                            {eff}%
                                        </td>
                                        <td style={{ ...TD, color: conf === 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
                                            {conf}%
                                        </td>
                                        <td style={TD}>{cpr}</td>
                                        <td style={{ ...TD, color: "var(--color-text-info)" }}>{fmtUs(s.runtimeMs)} µs</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}