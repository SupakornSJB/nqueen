import type { Step } from "../../lib/types";

interface StatsBarProps {
    steps: Step[];
    currentIdx: number;
    onShowSolutions: () => void;
    solutionCount: number;
    solvedSoFar: number;
}

export function StatsBar({ steps, currentIdx, onShowSolutions, solutionCount, solvedSoFar }: StatsBarProps) {
    let placements = 0, backtracks = 0, conflicts = 0;
    for (let i = 0; i <= currentIdx; i++) {
        const t = steps[i].type;
        if (t === "place") placements++;
        if (t === "backtrack" || t === "exhaust") backtracks++;
        if (t === "conflict") conflicts++;
    }

    const statCells = [
        { label: "Steps",      value: currentIdx, color: "var(--color-text-primary)",  bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)" },
        { label: "Placements", value: placements,  color: "var(--color-text-success)", bg: "var(--color-background-success)",   border: "var(--color-border-success)" },
        { label: "Conflicts",  value: conflicts,   color: "var(--color-text-danger)",  bg: "var(--color-background-danger)",    border: "var(--color-border-danger)" },
        { label: "Backtracks", value: backtracks,  color: "var(--color-text-warning)", bg: "var(--color-background-warning)",   border: "var(--color-border-warning)" },
    ];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {statCells.map(({ label, value, color, bg, border }) => (
                <div key={label} style={{
                    background: bg,
                    border: `0.5px solid ${border}`,
                    borderRadius: "var(--border-radius-md)",
                    padding: "8px 10px", textAlign: "center",
                }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
                    <div style={{ fontSize: 10, color, opacity: 0.7, marginTop: 2 }}>{label}</div>
                </div>
            ))}

            <button
                onClick={onShowSolutions}
                title={`View all ${solutionCount} solutions`}
                style={{
                    background: solvedSoFar > 0 ? "var(--color-background-success)" : "var(--color-background-secondary)",
                    border: solvedSoFar > 0 ? "0.5px solid var(--color-border-success)" : "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)", padding: "8px 10px",
                    textAlign: "center", cursor: "pointer", transition: "background 0.2s",
                }}
            >
                <div style={{ fontSize: 18, fontWeight: 500, color: solvedSoFar > 0 ? "var(--color-text-success)" : "var(--color-text-secondary)" }}>
                    {solvedSoFar}
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-tertiary)" }}>/{solutionCount}</span>
                </div>
                <div style={{ fontSize: 10, color: solvedSoFar > 0 ? "var(--color-text-success)" : "var(--color-text-secondary)", marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    Solutions <span style={{ fontSize: 9 }}>↗</span>
                </div>
            </button>
        </div>
    );
}