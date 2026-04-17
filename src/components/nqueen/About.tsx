import { useState, useEffect } from "react";
import type { MethodKey } from "../../lib/types";
import { METHOD_META } from "../../lib/constants";
import { useComplexityStore } from "../../store/complexityStore";

// ─── Static content ───────────────────────────────────────────────────────────

interface AlgoDesc { complexity: string; paragraphs: string[]; comparison: string; }

const DESCRIPTIONS: Record<MethodKey, AlgoDesc> = {
    bt: {
        complexity: "O(N·N!) time  ·  O(N) space",
        paragraphs: [
            "Naive Backtracking is the simplest correct approach to the N-Queens problem. It works row by row: for each row it tries every column from left to right. Before placing a queen it scans all queens already placed and checks for column or diagonal conflicts — if none exist, the queen is placed and the algorithm recurses to the next row.",
            "When no column in the current row is safe, the algorithm backtracks: it removes the queen placed in the previous row and resumes trying the next column from where it left off. This continues until all N queens are placed (a solution is found) or every possibility is exhausted.",
            "The time complexity is O(N·N!), not O(N!): the isSafe loop scans up to N already-placed queens per check, adding an O(N) factor on top of the O(N!) search tree. Space is O(N) because queens are stored in a 1-D array (board[row] = col) and the call stack depth is at most N.",
        ],
        comparison: "vs Hash Backtracking: same step count (identical search tree) but HT reduces time from O(N·N!) to O(N!) by replacing the O(N) isSafe scan with O(1) set lookups. vs Forward Checking: BT generates roughly 3–4× more steps at N=8 because it never prunes based on future feasibility. vs Bitmask: BT generates 4–6× more steps because it checks invalid positions explicitly.",
    },
    ht: {
        complexity: "O(N!) time  ·  O(N) space",
        paragraphs: [
            "Hash Backtracking is a direct upgrade to the naive approach that changes only the data structure used for conflict detection. Three hash sets are maintained: one for occupied columns, one for occupied diagonals (row − col), and one for anti-diagonals (row + col). Checking whether a cell is safe becomes three O(1) set-membership tests instead of an O(N) loop scan.",
            "Because the hash sets mirror exactly which positions are attacked, the search tree is identical to naive backtracking — the same branches are explored in the same order, and the step counts are equal. The sole difference is how quickly each individual node is evaluated. This makes it the clearest example of how a data-structure choice alone (array scan → hash set) improves runtime without altering the algorithm's logic.",
            "Space is O(N): at most N entries are live in each set at any time. Crucially, this is the same asymptotic space as BT but with a strictly better time complexity — O(N!) vs BT's O(N·N!) — because each conflict check drops from O(N) to O(1).",
        ],
        comparison: "vs Naive Backtracking: identical step count (same search tree) but ~2–4× faster in wall-clock time at moderate N because conflict checks drop from O(N) to O(1). vs Forward Checking: same or more steps than FC because no domain pruning is performed. vs Bitmask: BM remains faster — it pre-filters invalid candidates so only safe positions are ever visited, whereas hash backtracking still tries all N columns per row.",
    },
    fc: {
        complexity: "O(N!) time  ·  O(N²) space",
        paragraphs: [
            "Forward Checking extends backtracking with a look-ahead step. Before recursing, it simulates the placement and removes the newly attacked squares from the valid-column sets ('domains') of all future rows. If any future row ends up with an empty domain — meaning no column would be legally available — the placement is immediately rejected without ever recursing into it.",
            "This early pruning eliminates large subtrees from the search space before they are explored. Rows that backtracking would visit thousands of times are cut off as soon as they become unsatisfiable, which is why the step count is substantially lower than plain backtracking.",
            "The trade-off is memory: forward checking must copy the domain sets on each recursive call (O(N²) per level), whereas backtracking needs only O(N) for the board array. For small N the extra memory is negligible, but it grows with problem size.",
        ],
        comparison: "vs Naive Backtracking: FC uses roughly 3–4× fewer steps at N=8 due to look-ahead pruning. vs Hash Backtracking: same pruning advantage; step counts are identical to FC vs BT ratio. vs Bitmask: FC uses 1.5–2.5× more steps because it iterates over domain candidates explicitly and copies domain arrays. FC's conflict rate is lower than BT/HT but non-zero; Bitmask's is always 0%.",
    },
    bm: {
        complexity: "O(N!) time  ·  O(N) space",
        paragraphs: [
            "The Bitmask approach represents attacked columns as integers. Three bitmasks track which columns are blocked: cols for vertical attacks, diag1 for left-leaning diagonals, and diag2 for right-leaning diagonals. For any given row, all safe columns are computed in a single bitwise operation: full & ~(cols | diag1 | diag2), where full is a mask of all N column bits.",
            "Only positions present in that bitmask are ever visited — the algorithm never checks a cell only to reject it. When moving to the next row the diagonal masks are each shifted by one bit to account for the row offset. This means zero explicit conflict-checking steps appear in the trace; the mask pre-filters them out entirely.",
            "Because every operation is O(1) bit arithmetic, and no invalid positions are visited, the bitmask approach has the smallest step count of all four methods. It is the standard technique used in competitive-programming solutions where N-Queens needs to run at maximum speed.",
        ],
        comparison: "Bitmask has the fewest steps of all four methods. Its conflict rate is always 0% and its check efficiency approaches 100% because only valid positions are tried. At N=8, BM uses roughly 4–6× fewer steps than BT/HT and 1.5–2.5× fewer than FC.",
    },
};

// Per-method N ranges.  BM is pure bit-ops so it stays fast at higher N.
const NS_FOR_METHOD: Record<MethodKey, number[]> = {
    bt: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    ht: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    fc: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    bm: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ color }: { color: string }) {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke={color} strokeWidth="2.5" opacity={0.18} />
            <path d="M14 4 A10 10 0 0 1 24 14" stroke={color} strokeWidth="2.5" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate"
                    from="0 14 14" to="360 14 14" dur="0.75s" repeatCount="indefinite" />
            </path>
        </svg>
    );
}

// ─── Complexity chart ─────────────────────────────────────────────────────────

type HoverInfo = { n: number; us: number; runIdx: number; totalRuns: number; svgX: number; svgY: number };

function ComplexityChart({ method }: { method: MethodKey }) {
    const meta     = METHOD_META[method];
    const data     = useComplexityStore(s => s.results[method]);
    const progress = useComplexityStore(s => s.progress[method]);
    const [hovered, setHovered] = useState<HoverInfo | null>(null);

    // ── Loading state ──────────────────────────────────────────────────────────
    if (!data) {
        const pct = progress ? Math.round(progress.done / progress.total * 100) : 0;
        const label = progress
            ? `N=${progress.currentN} done — ${pct}% (${progress.done}/${progress.total})`
            : 'Starting worker…';
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "32px 0", gap: 12 }}>
                <Spinner color={meta.accent} />
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center" }}>
                    {label}
                </div>
                <div style={{ width: 220, height: 4, background: "var(--color-background-secondary)",
                    borderRadius: 99, overflow: "hidden", border: `0.5px solid ${meta.accentBorder}` }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: meta.accent,
                        borderRadius: 99, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                    Running computations in the background...
                </div>
            </div>
        );
    }

    // ── Chart maths ───────────────────────────────────────────────────────────

    const medians = data.map(({ n, times }) => {
        const sorted = [...times].sort((a, b) => a - b);
        return { n, med: Math.max(0.001, sorted[Math.floor(sorted.length / 2)]) };
    });
    const t4 = medians[0].med; // N=4 median — everything is normalised to this

    const scatter: { xIdx: number; runIdx: number; val: number; rawUs: number }[] = [];
    data.forEach(({ times }, xIdx) => {
        times.forEach((t, runIdx) => scatter.push({
            xIdx, runIdx,
            val:   Math.max(0.001, t) / t4,
            rawUs: Math.max(0.001, t),
        }));
    });

    // Exponential regression on semi-log: ln(val) = slope·N + intcp → val ≈ e^intcp · (e^slope)^N
    // N-Queens step counts grow ~exponentially (constant ratio per unit N), not as a power law.
    // On a semi-log chart (linear X = N, log Y) this gives a geometrically straight line.
    const logPts = scatter.map(({ xIdx, val }) => ({ x: data[xIdx].n, ly: Math.log(val) }));
    const rn     = logPts.length;
    const meanX  = logPts.reduce((s, p) => s + p.x,  0) / rn;
    const meanLy = logPts.reduce((s, p) => s + p.ly, 0) / rn;
    const sxx    = logPts.reduce((s, p) => s + (p.x  - meanX)  ** 2, 0);
    const sxy    = logPts.reduce((s, p) => s + (p.x  - meanX) * (p.ly - meanLy), 0);
    const slope  = sxx > 0 ? sxy / sxx : 0;
    const intcp  = meanLy - slope * meanX;
    const base   = Math.exp(slope); // growth factor per unit N (e.g. ~4–5 for BT)

    // O(N!) relative to N=4 baseline
    const factRel = (n: number) => { let f = 1; for (let i = 5; i <= n; i++) f *= i; return f; };

    const maxLog = Math.max(
        Math.log10(Math.max(...scatter.map(p => p.val))),
        Math.log10(factRel(data[data.length - 1].n)),
        1,
    );

    // ── SVG layout ─────────────────────────────────────────────────────────────
    const W = 500, H = 230;
    const PAD = { top: 14, bottom: 34, left: 56, right: 16 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    // X axis is linear in N so that the exponential regression line is geometrically straight.
    const xPosN = (n: number) =>
        PAD.left + ((n - data[0].n) / (data[data.length - 1].n - data[0].n)) * cW;

    // Y axis is log-scaled (same as before).
    const yPos = (val: number) => {
        const lv = Math.max(0, Math.log10(Math.max(0.0001, val)));
        return PAD.top + cH - (lv / maxLog) * cH;
    };

    // Regression: on a semi-log chart an exponential is a straight line — only need 2 pts.
    const n0 = data[0].n, nL = data[data.length - 1].n;
    const regPts = [
        `${xPosN(n0).toFixed(1)},${yPos(Math.exp(intcp + slope * n0)).toFixed(1)}`,
        `${xPosN(nL).toFixed(1)},${yPos(Math.exp(intcp + slope * nL)).toFixed(1)}`,
    ].join(" ");

    // O(N!) is super-polynomial → curves upward on a log-log chart (needs all points).
    const factPts = data.map(({ n }) =>
        `${xPosN(n).toFixed(1)},${yPos(factRel(n)).toFixed(1)}`).join(" ");

    const yTicks  = Array.from({ length: Math.ceil(maxLog) + 1 }, (_, i) => i);
    const totalNs = data[0].times.length;

    // ── Tooltip ────────────────────────────────────────────────────────────────
    const TTIP_W = 114, TTIP_H = 52;
    const renderTooltip = (h: HoverInfo) => {
        const tx = h.svgX > W / 2 ? h.svgX - TTIP_W - 10 : h.svgX + 10;
        const ty = h.svgY > H / 2 ? h.svgY - TTIP_H - 6  : h.svgY + 6;
        const usStr = h.us < 1 ? `${(h.us * 1000).toFixed(1)} ns`
            : h.us < 1000 ? `${h.us.toFixed(2)} µs`
            : `${(h.us / 1000).toFixed(3)} ms`;
        return (
            <g style={{ pointerEvents: "none" }}>
                <rect x={tx} y={ty} width={TTIP_W} height={TTIP_H} rx={5}
                    fill="var(--color-background-primary)" stroke={meta.accent}
                    strokeWidth={1} opacity={0.97} />
                <text x={tx + TTIP_W / 2} y={ty + 15} textAnchor="middle" fontSize={10}
                    fontWeight={700} fill={meta.accent} fontFamily="var(--font-sans)">N = {h.n}</text>
                <text x={tx + TTIP_W / 2} y={ty + 29} textAnchor="middle" fontSize={9}
                    fill="var(--color-text-primary)" fontFamily="var(--font-mono)">{usStr}</text>
                <text x={tx + TTIP_W / 2} y={ty + 43} textAnchor="middle" fontSize={8}
                    fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">
                    run {h.runIdx + 1} / {h.totalRuns}
                </text>
            </g>
        );
    };

    return (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    Runtime growth vs O(N!) — semi-log scale, relative to N=4 baseline
                </span>
                <span style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", color: meta.accent, opacity: 0.9,
                    padding: "1px 8px", borderRadius: 99,
                    background: meta.accentBg, border: `0.5px solid ${meta.accentBorder}`,
                }}>
                    empirical ~O({base.toFixed(2)}^N) · N={n0}..{nL} · {totalNs} runs/N
                </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} width="100%"
                style={{ display: "block", cursor: "crosshair" }}
                onMouseLeave={() => setHovered(null)}>

                {/* Y grid + labels */}
                {yTicks.map(e => {
                    const y = PAD.top + cH - (e / maxLog) * cH;
                    return (
                        <g key={e}>
                            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                                stroke="var(--color-border-tertiary)" strokeWidth={0.5} />
                            <text x={PAD.left - 5} y={y + 3.5} textAnchor="end" fontSize={8}
                                fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">
                                {e === 0 ? "1×" : `10^${e}×`}
                            </text>
                        </g>
                    );
                })}

                {/* X grid lines (light vertical) at each N value */}
                {data.map(({ n }) => (
                    <line key={n} x1={xPosN(n)} y1={PAD.top} x2={xPosN(n)} y2={PAD.top + cH}
                        stroke="var(--color-border-tertiary)" strokeWidth={0.5} opacity={0.5} />
                ))}

                {/* O(N!) dashed reference — curves upward (super-polynomial) */}
                <polyline points={factPts} fill="none"
                    stroke="var(--color-text-tertiary)" strokeWidth={1.5}
                    strokeDasharray="5,3" opacity={0.6} />

                {/* Scatter dots */}
                {scatter.map(({ xIdx, runIdx, val, rawUs }) => {
                    const runs  = data[xIdx].times.length;
                    const n     = data[xIdx].n;
                    const cx    = xPosN(n) + (runIdx - (runs - 1) / 2) * 2.6;
                    const cy    = yPos(val);
                    const isHov = hovered?.n === n && hovered.runIdx === runIdx;
                    return (
                        <circle key={`${xIdx}-${runIdx}`}
                            cx={cx} cy={cy} r={isHov ? 3.8 : 2.4}
                            fill={meta.accent} opacity={isHov ? 0.9 : 0.38}
                            style={{ cursor: "pointer", transition: "r 0.1s, opacity 0.1s" }}
                            onMouseEnter={() =>
                                setHovered({ n, us: rawUs, runIdx, totalRuns: runs, svgX: cx, svgY: cy })}
                        />
                    );
                })}

                {/* Regression line — exactly 2 pts = straight line on log-log axes */}
                <polyline points={regPts} fill="none"
                    stroke={meta.accent} strokeWidth={2.2} opacity={0.9} />

                {/* Median dots */}
                {medians.map(({ n, med }) => (
                    <circle key={n} cx={xPosN(n)} cy={yPos(med / t4)} r={4}
                        fill={meta.accent}
                        stroke="var(--color-background-primary)" strokeWidth={1.5} />
                ))}

                {/* Axes */}
                <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />
                <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />

                {/* X labels */}
                {data.map(({ n }) => (
                    <text key={n} x={xPosN(n)} y={H - 16} textAnchor="middle" fontSize={9}
                        fill="var(--color-text-secondary)" fontFamily="var(--font-sans)">{n}</text>
                ))}
                <text x={PAD.left + cW / 2} y={H - 3} textAnchor="middle" fontSize={8}
                    fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">
                    N (board size)
                </text>

                {hovered && renderTooltip(hovered)}
            </svg>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, fontSize: 10, color: "var(--color-text-secondary)",
                marginTop: 5, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="16" height="8">
                        <circle cx="8" cy="4" r="2.4" fill={meta.accent} opacity={0.38} />
                    </svg>
                    Timing run (hover for µs)
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="20" height="8">
                        <line x1="0" y1="4" x2="20" y2="4" stroke={meta.accent} strokeWidth="2.2" />
                    </svg>
                    Best-fit line
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="16" height="8">
                        <circle cx="8" cy="4" r="4" fill={meta.accent}
                            stroke="white" strokeWidth="1.5" />
                    </svg>
                    Median per N
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <svg width="20" height="4">
                        <line x1="0" y1="2" x2="20" y2="2"
                            stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeDasharray="4,2" />
                    </svg>
                    O(N!) reference
                </span>
                <span style={{ marginLeft: "auto", color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                    log Y · linear N (semi-log)
                </span>
            </div>
        </div>
    );
}

// ─── Algorithms view ──────────────────────────────────────────────────────────

export function AboutView() {
    const [expanded, setExpanded]   = useState<MethodKey | null>(null);
    const startIfNeeded             = useComplexityStore(s => s.startIfNeeded);
    const results                   = useComplexityStore(s => s.results);
    const progressMap               = useComplexityStore(s => s.progress);

    // Kick off all three workers as soon as this page is opened.
    // Workers that are already running or done are silently skipped.
    useEffect(() => {
        (["bt", "ht", "fc", "bm"] as MethodKey[]).forEach(m => startIfNeeded(m, NS_FOR_METHOD[m]));
    }, [startIfNeeded]);

    const methods: MethodKey[] = ["bt", "ht", "fc", "bm"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {methods.map(m => {
                const meta       = METHOD_META[m];
                const desc       = DESCRIPTIONS[m];
                const isExpanded = expanded === m;
                const isCached   = !!results[m];

                return (
                    <div key={m} style={{
                        background: "var(--color-background-primary)",
                        border: `1.5px solid ${isExpanded ? meta.accent : meta.accentBorder}`,
                        borderRadius: "var(--border-radius-lg)",
                        padding: isExpanded ? "22px 24px" : "18px 20px",
                        display: "flex", flexDirection: "column", gap: isExpanded ? 14 : 12,
                        transition: "padding 0.15s, border-color 0.15s",
                    }}>
                        {/* Header */}
                        <div onClick={() => setExpanded(isExpanded ? null : m)}
                            style={{ cursor: "pointer" }}>
                            <div style={{ display: "flex", alignItems: "baseline",
                                justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: "50%",
                                            background: meta.accent, flexShrink: 0 }} />
                                        <span style={{ fontSize: isExpanded ? 17 : 16,
                                            fontWeight: 700, color: meta.accent }}>
                                            {meta.name}
                                        </span>
                                    </div>
                                    <span style={{
                                        fontSize: 10, fontFamily: "var(--font-mono)",
                                        color: "var(--color-text-tertiary)", padding: "2px 8px",
                                        borderRadius: 99, background: "var(--color-background-secondary)",
                                        border: "0.5px solid var(--color-border-tertiary)",
                                    }}>
                                        {desc.complexity}
                                    </span>
                                    {isCached ? (
                                        <span style={{
                                            fontSize: 9, padding: "1px 6px", borderRadius: 99,
                                            background: meta.accentBg, color: meta.accent,
                                            border: `0.5px solid ${meta.accentBorder}`,
                                        }}>
                                            chart ready
                                        </span>
                                    ) : progressMap[m] && (
                                        <span style={{
                                            fontSize: 9, padding: "1px 6px", borderRadius: 99,
                                            background: "var(--color-background-secondary)",
                                            color: "var(--color-text-secondary)",
                                            border: "0.5px solid var(--color-border-tertiary)",
                                        }}>
                                            chart loading
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: 11, userSelect: "none",
                                    color: isExpanded ? meta.accent : "var(--color-text-tertiary)",
                                    transition: "color 0.15s" }}>
                                    {isExpanded ? "▲ collapse" : "▼ expand"}
                                </span>
                            </div>
                        </div>

                        {/* Paragraphs — always visible */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {desc.paragraphs.map((p, i) => (
                                <p key={i} style={{ margin: 0, fontSize: isExpanded ? 14 : 13,
                                    lineHeight: 1.65, color: "var(--color-text-secondary)",
                                    textAlign: "left" }}>
                                    {p}
                                </p>
                            ))}
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                            <>
                                <div style={{
                                    padding: "10px 14px", background: meta.accentBg,
                                    border: `0.5px solid ${meta.accentBorder}`,
                                    borderRadius: "var(--border-radius-md)",
                                }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: meta.accent,
                                        marginBottom: 5, textTransform: "uppercase",
                                        letterSpacing: "0.06em" }}>
                                        Comparison summary
                                    </div>
                                    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6,
                                        color: "var(--color-text-secondary)", textAlign: "left" }}>
                                        {desc.comparison}
                                    </p>
                                </div>

                                <div style={{
                                    padding: "14px 16px",
                                    background: "var(--color-background-secondary)",
                                    border: "0.5px solid var(--color-border-tertiary)",
                                    borderRadius: "var(--border-radius-md)",
                                }}>
                                    <ComplexityChart method={m} />
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
