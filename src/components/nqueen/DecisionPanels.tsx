import { useEffect, useRef } from "react";
import type { Step, VisitedState, NodeColor } from "../../lib/types";
import { TYPE_META } from "../../lib/constants";

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
        else if (s.type === "backtrack") visited[key] = "backtrack";
        else if (s.type === "solution") {
            for (let r = 0; r < n; r++) visited[`${r}-${s.board[r]}`] = "solution";
        }
    }

    const cur = steps[currentIdx];
    const activeKey = cur ? `${cur.row}-${cur.col}` : null;

    const rowH = 52;
    const colW = Math.max(32, Math.min(48, 320 / n));
    const svgW = n * colW + 40;
    const svgH = n * rowH + 20;
    const cx = (col: number) => 20 + col * colW + colW / 2;
    const cy = (row: number) => 20 + row * rowH + rowH / 2;

    const nodeColor = (row: number, col: number): NodeColor => {
        const v = visited[`${row}-${col}`];
        if (!v) return { fill: "var(--color-background-secondary)", stroke: "var(--color-border-tertiary)", text: "var(--color-text-tertiary)" };
        if (v === "solution")  return { fill: "var(--color-background-success)", stroke: "var(--color-border-success)", text: "var(--color-text-success)" };
        if (v === "place" || v === "backtrack") return { fill: "var(--color-background-info)", stroke: "var(--color-border-info)", text: "var(--color-text-info)" };
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
                                {row > 0 && (
                                    <line
                                        x1={cx(col)} y1={cy(row) - rowH / 2}
                                        x2={cx(col)} y2={cy(row - 1) + 10}
                                        stroke={visited[`${row}-${col}`] ? c.stroke : "var(--color-border-tertiary)"}
                                        strokeWidth={0.5}
                                        strokeDasharray={visited[`${row}-${col}`] ? undefined : "3 3"}
                                    />
                                )}
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
                    { bg: "var(--color-background-info)",      border: "var(--color-border-info)",      label: "Active" },
                    { bg: "var(--color-background-danger)",    border: "var(--color-border-danger)",    label: "Conflict" },
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