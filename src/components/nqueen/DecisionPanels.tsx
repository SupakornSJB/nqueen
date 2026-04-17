import { useEffect, useRef } from "react";
import type { Step, VisitedState, NodeColor } from "../../lib/types";
import { TYPE_META } from "../../lib/constants";

// ─── Recursion Depth Chart ────────────────────────────────────────────────────

export function RecursionDepthChart({ steps, currentIdx }: { steps: Step[]; currentIdx: number }) {
    const W = 600, H = 150;
    const PAD = { top: 12, bottom: 24, left: 28, right: 8 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top - PAD.bottom;

    const total = steps.length;
    const maxDepth = steps.reduce((m, s) => Math.max(m, s.stackDepth), 0);

    // Prefix sums for O(1) moving average queries
    const prefix = new Array(total + 1).fill(0);
    for (let i = 0; i < total; i++) prefix[i + 1] = prefix[i] + steps[i].stackDepth;
    const rangeAvg = (from: number, to: number) => (prefix[to + 1] - prefix[from]) / (to - from + 1);

    const maWindow = Math.max(5, Math.floor(total / 40));

    // Downsample to ≤600 points for rendering performance
    const stride = Math.max(1, Math.floor(total / 600));
    const rawPts: string[] = [];
    const maPts: string[] = [];
    for (let i = 0; i < total; i += stride) {
        const x = PAD.left + (i / Math.max(1, total - 1)) * cW;
        rawPts.push(`${x.toFixed(1)},${(PAD.top + cH - (steps[i].stackDepth / Math.max(1, maxDepth)) * cH).toFixed(1)}`);
        const from = Math.max(0, i - Math.floor(maWindow / 2));
        const to = Math.min(total - 1, i + Math.ceil(maWindow / 2));
        maPts.push(`${x.toFixed(1)},${(PAD.top + cH - (rangeAvg(from, to) / Math.max(1, maxDepth)) * cH).toFixed(1)}`);
    }
    // Always include last point
    if (total > 1 && (total - 1) % stride !== 0) {
        const x = PAD.left + cW;
        rawPts.push(`${x.toFixed(1)},${(PAD.top + cH - (steps[total - 1].stackDepth / Math.max(1, maxDepth)) * cH).toFixed(1)}`);
        const avg = rangeAvg(Math.max(0, total - 1 - Math.floor(maWindow / 2)), total - 1);
        maPts.push(`${x.toFixed(1)},${(PAD.top + cH - (avg / Math.max(1, maxDepth)) * cH).toFixed(1)}`);
    }

    const curX = PAD.left + (currentIdx / Math.max(1, total - 1)) * cW;
    const curDepth = steps[currentIdx]?.stackDepth ?? 0;
    const curY = PAD.top + cH - (curDepth / Math.max(1, maxDepth)) * cH;
    const overallAvg = total > 0 ? prefix[total] / total : 0;

    const yTicks = maxDepth <= 2 ? [0, maxDepth] : [0, Math.floor(maxDepth / 2), maxDepth];
    const lastRawX = rawPts.length > 0 ? parseFloat(rawPts[rawPts.length - 1].split(",")[0]) : PAD.left + cW;

    return (
        <div>
            <div style={{ display: "flex", gap: 14, marginBottom: 6, fontSize: 10, color: "var(--color-text-tertiary)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="var(--color-text-info)" strokeWidth="1.2" opacity="0.55" /></svg>
                    Raw depth
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="18" height="4"><line x1="0" y1="2" x2="18" y2="2" stroke="var(--color-text-warning)" strokeWidth="1.8" /></svg>
                    Moving avg
                </span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
                {yTicks.map(d => {
                    const y = PAD.top + cH - (d / Math.max(1, maxDepth)) * cH;
                    return (
                        <g key={d}>
                            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
                                stroke="var(--color-border-tertiary)" strokeWidth={0.5} />
                            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={8}
                                fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">{d}</text>
                        </g>
                    );
                })}
                {/* Filled area under raw line */}
                {rawPts.length > 0 && (
                    <polygon
                        points={[`${PAD.left},${PAD.top + cH}`, ...rawPts, `${lastRawX},${PAD.top + cH}`].join(" ")}
                        fill="var(--color-background-info)" opacity={0.15}
                    />
                )}
                {/* Raw depth */}
                <polyline points={rawPts.join(" ")} fill="none"
                    stroke="var(--color-text-info)" strokeWidth={1} opacity={0.55} />
                {/* Moving average */}
                <polyline points={maPts.join(" ")} fill="none"
                    stroke="var(--color-text-warning)" strokeWidth={1.8} opacity={0.9} />
                {/* Current position marker */}
                <line x1={curX} y1={PAD.top} x2={curX} y2={PAD.top + cH}
                    stroke="var(--color-text-primary)" strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />
                <circle cx={curX} cy={curY} r={3.5} fill="var(--color-text-primary)" />
                {/* Axes */}
                <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />
                <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH}
                    stroke="var(--color-border-secondary)" strokeWidth={0.5} />
                <text x={PAD.left} y={H - 5} textAnchor="start" fontSize={7.5}
                    fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">step 0</text>
                <text x={PAD.left + cW} y={H - 5} textAnchor="end" fontSize={7.5}
                    fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">step {total - 1}</text>
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 3 }}>
                <span>Current depth: <strong style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{curDepth}</strong></span>
                <span>Avg depth: <strong style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)" }}>{overallAvg.toFixed(2)}</strong></span>
            </div>
        </div>
    );
}

// ─── Call Stack ───────────────────────────────────────────────────────────────

export function CallStack({ step, n }: { step: Step | undefined; n: number }) {
    const depth = step ? step.stackDepth : 0;
    const frames = Array.from({ length: Math.min(depth + 1, n) }, (_, i) => ({
        row: i,
        isTop: i === depth,
        isBacktrack: !!(step && step.type === "backtrack" && i === depth),
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {frames.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: "12px 0" }}>
                    Stack empty — not started
                </div>
            )}
            {[...frames].reverse().map(({ row, isTop, isBacktrack }) => {
                const queen = step && step.board[row] >= 0 ? step.board[row] : null;
                return (
                    <div key={row} style={{
                        padding: "8px 12px", border: "0.5px solid",
                        borderColor: isBacktrack ? "var(--color-border-warning)" : isTop ? "var(--color-border-info)" : "var(--color-border-tertiary)",
                        background: isBacktrack ? "var(--color-background-warning)" : isTop ? "var(--color-background-info)" : "var(--color-background-primary)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.2s",
                    }}>
                        <div>
                            <div style={{
                                fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 500,
                                color: isBacktrack ? "var(--color-text-warning)" : isTop ? "var(--color-text-info)" : "var(--color-text-primary)",
                            }}>
                                solve(row={row})
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>
                                {queen !== null ? `queen at col ${queen}` : "searching…"}
                            </div>
                        </div>
                        <div style={{
                            fontSize: 10, padding: "2px 7px", borderRadius: 99,
                            background: "var(--color-background-secondary)", color: "var(--color-text-secondary)",
                        }}>
                            depth {row}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Decision Log ─────────────────────────────────────────────────────────────

export function DecisionLog({ steps, currentIdx }: { steps: Step[]; currentIdx: number }) {
    const logRef = useRef<HTMLDivElement>(null);
    const visible = steps.slice(0, currentIdx + 1).slice(-40).reverse();

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = 0;
    }, [currentIdx]);

    return (
        <div ref={logRef} style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
            {visible.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", textAlign: "center", padding: "12px 0" }}>
                    No events yet
                </div>
            )}
            {visible.map((s, i) => {
                const meta = TYPE_META[s.type] ?? TYPE_META.check;
                const isCurrent = i === 0;
                return (
                    <div key={currentIdx - i} style={{
                        display: "flex", gap: 8, padding: isCurrent ? "8px 10px" : "7px 4px",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        borderRadius: isCurrent ? "var(--border-radius-md)" : 0,
                        background: isCurrent ? meta.tagBg : "transparent",
                        border: isCurrent ? `0.5px solid ${meta.tagBorder}` : undefined,
                        marginBottom: isCurrent ? 4 : 0,
                        opacity: isCurrent ? 1 : Math.max(0.3, 0.9 - i * 0.04),
                    }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot, flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: isCurrent ? meta.tagText : "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", fontWeight: isCurrent ? 500 : 400 }}>
                                <span>{s.reason}</span>
                                <span style={{
                                    fontSize: 10, padding: "1px 6px", borderRadius: 99,
                                    background: meta.tagBg, color: meta.tagText,
                                    border: `0.5px solid ${meta.tagBorder}`, fontWeight: 500,
                                }}>
                                    {meta.label}
                                </span>
                            </div>
                        </div>
                        <div style={{ fontSize: 10, color: isCurrent ? meta.tagText : "var(--color-text-tertiary)", opacity: isCurrent ? 0.7 : 1, flexShrink: 0, marginTop: 2 }}>
                            #{currentIdx - i}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Decision Tree ────────────────────────────────────────────────────────────

export function DecisionTree({ steps, currentIdx, n }: { steps: Step[]; currentIdx: number; n: number }) {
    if (n > 6) {
        return (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center", padding: "16px 0" }}>
                Tree view available for N ≤ 6 (too many nodes for larger boards)
            </div>
        );
    }

    const visited: Record<string, VisitedState> = {};
    for (let i = 0; i <= currentIdx; i++) {
        const s = steps[i];
        const key = `${s.row}-${s.col}`;
        if (s.type === "place") visited[key] = "place";
        else if (s.type === "conflict" || s.type === "exhaust") visited[key] ??= "conflict";
        else if (s.type === "prune") visited[key] ??= "prune";
        else if (s.type === "backtrack") {
            // Clear the backtracked node and ALL nodes in rows below (entire branch unwound)
            delete visited[key];
            for (let r = s.row + 1; r < n; r++) {
                for (let c = 0; c < n; c++) delete visited[`${r}-${c}`];
            }
            // Queens above this row are still placed — reset any "solution" green back to "place"
            for (let r = 0; r < s.row; r++) {
                const c = s.board[r];
                if (c >= 0 && visited[`${r}-${c}`] === "solution") visited[`${r}-${c}`] = "place";
            }
        } else if (s.type === "solution") {
            for (let r = 0; r < n; r++) visited[`${r}-${s.board[r]}`] = "solution";
        }
    }

    const cur = steps[currentIdx];
    const activeKey = cur ? `${cur.row}-${cur.col}` : null;

    const rowH = 40;
    const colW = Math.max(32, Math.min(48, 320 / n));
    const svgW = n * colW + 40;
    const svgH = n * rowH + 8;
    const cx = (col: number) => 20 + col * colW + colW / 2;
    const cy = (row: number) => 8 + row * rowH + rowH / 2;

    const nodeColor = (row: number, col: number): NodeColor => {
        const v = visited[`${row}-${col}`];
        if (!v) return { fill: "var(--color-background-secondary)", stroke: "var(--color-border-tertiary)", text: "var(--color-text-tertiary)" };
        if (v === "solution")  return { fill: "var(--color-background-success)", stroke: "var(--color-border-success)", text: "var(--color-text-success)" };
        if (v === "place") return { fill: "var(--color-background-info)", stroke: "var(--color-border-info)", text: "var(--color-text-info)" };
        if (v === "prune") return { fill: "var(--color-background-warning)", stroke: "var(--color-border-warning)", text: "var(--color-text-warning)" };
        return { fill: "var(--color-background-danger)", stroke: "var(--color-border-danger)", text: "var(--color-text-danger)" };
    };

    return (
        <div style={{ overflowX: "auto" }}>
            <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block", minWidth: svgW }}>
                {Array.from({ length: n }, (_, row) =>
                    Array.from({ length: n }, (_, col) => {
                        const c = nodeColor(row, col);
                        const active = activeKey === `${row}-${col}`;
                        return (
                            <g key={`${row}-${col}`}>
                                <rect
                                    x={cx(col) - colW / 2 + 3} y={cy(row) - 13}
                                    width={colW - 6} height={26} rx={5}
                                    fill={c.fill}
                                    stroke={active ? "var(--color-border-info)" : c.stroke}
                                    strokeWidth={active ? 1.5 : 0.5}
                                />
                                <text x={cx(col)} y={cy(row) + 4} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill={c.text}>
                                    c{col}
                                </text>
                            </g>
                        );
                    })
                )}
                {Array.from({ length: n }, (_, row) => (
                    <text key={row} x={6} y={cy(row) + 4} fontSize={9} fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">
                        r{row}
                    </text>
                ))}
            </svg>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {[
                    { bg: "var(--color-background-info)",      border: "var(--color-border-info)",      label: "Placed" },
                    { bg: "var(--color-background-danger)",    border: "var(--color-border-danger)",    label: "Conflict" },
                    { bg: "var(--color-background-warning)",   border: "var(--color-border-warning)",   label: "Pruned (FC)" },
                    { bg: "var(--color-background-success)",   border: "var(--color-border-success)",   label: "Solution" },
                    { bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)",  label: "Unvisited" },
                ].map(({ bg, border, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: bg, border: `0.5px solid ${border}` }} />
                        <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}