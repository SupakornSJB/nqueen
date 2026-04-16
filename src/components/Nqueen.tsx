import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode, CSSProperties } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type StepType = "enter" | "check" | "place" | "conflict" | "backtrack" | "exhaust" | "solution";
type CellState = "empty" | "queen" | "checking" | "conflict" | "backtrack" | "solution";
type SpeedKey = "slow" | "medium" | "fast" | "vfast";
type TabKey = "log" | "stack" | "tree";
type VisitedState = "place" | "conflict" | "backtrack" | "solution";
type MethodKey = "bt" | "fc";

interface Step {
    type: StepType;
    board: number[];
    row: number;
    col: number;
    reason: string;
    stackDepth: number;
}

interface TypeMeta {
    label: string;
    dot: string;
    tagBg: string;
    tagText: string;
    tagBorder: string;
}

interface NodeColor {
    fill: string;
    stroke: string;
    text: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Board cell colors are hardcoded (physical-color scene — intentionally stable across modes).
// All surrounding UI uses CSS custom properties for full dark-mode compatibility.
const CELL: Record<string, string> = {
    queenBg:       "#1e3d1a", queenBorder:    "#4a7c3f", queenText:    "#c0dd97",
    checkingBg:    "#0d2a47", checkingBorder: "#2a6aaa", checkingText: "#b5d4f4",
    conflictBg:    "#3d1010", conflictBorder: "#8b2020", conflictText: "#f7c1c1",
    backtrackBg:   "#3d2800", backtrackBorder:"#8b6200", backtrackText:"#fac775",
    solutionBg:    "#0d3020", solutionBorder: "#1a6a50", solutionText: "#9fe1cb",
};

const TYPE_META: Record<StepType, TypeMeta> = {
    enter:     { label: "Enter",     dot: "var(--color-text-info)",    tagBg: "var(--color-background-info)",    tagText: "var(--color-text-info)",    tagBorder: "var(--color-border-info)" },
    check:     { label: "Check",     dot: "var(--color-text-info)",    tagBg: "var(--color-background-info)",    tagText: "var(--color-text-info)",    tagBorder: "var(--color-border-info)" },
    place:     { label: "Place",     dot: "var(--color-text-success)", tagBg: "var(--color-background-success)", tagText: "var(--color-text-success)", tagBorder: "var(--color-border-success)" },
    conflict:  { label: "Conflict",  dot: "var(--color-text-danger)",  tagBg: "var(--color-background-danger)",  tagText: "var(--color-text-danger)",  tagBorder: "var(--color-border-danger)" },
    backtrack: { label: "Backtrack", dot: "var(--color-text-warning)", tagBg: "var(--color-background-warning)", tagText: "var(--color-text-warning)", tagBorder: "var(--color-border-warning)" },
    exhaust:   { label: "Exhaust",   dot: "var(--color-text-danger)",  tagBg: "var(--color-background-danger)",  tagText: "var(--color-text-danger)",  tagBorder: "var(--color-border-danger)" },
    solution:  { label: "Solution",  dot: "var(--color-text-success)", tagBg: "var(--color-background-success)", tagText: "var(--color-text-success)", tagBorder: "var(--color-border-success)" },
};

const SPEED_MS: Record<SpeedKey, number> = { slow: 600, medium: 200, fast: 60, vfast: 16 };

const METHOD_META: Record<MethodKey, { name: string; desc: string; accent: string; accentBg: string; accentBorder: string }> = {
    bt: {
        name: "Backtracking",
        desc: "Tries every column, backtracks only on direct queen conflict",
        accent: "#f59e0b",
        accentBg: "rgba(245,158,11,0.10)",
        accentBorder: "rgba(245,158,11,0.38)",
    },
    fc: {
        name: "Forward Checking",
        desc: "Prunes branches when any future row loses all valid columns",
        accent: "#10b981",
        accentBg: "rgba(16,185,129,0.10)",
        accentBorder: "rgba(16,185,129,0.38)",
    },
};

// ─── Algorithm ────────────────────────────────────────────────────────────────

function buildSteps(n: number): Step[] {
    const steps: Step[] = [];
    const board = Array<number>(n).fill(-1);

    function isSafe(b: number[], row: number, col: number): boolean {
        for (let r = 0; r < row; r++) {
            if (b[r] === col) return false;
            if (Math.abs(b[r] - col) === Math.abs(r - row)) return false;
        }
        return true;
    }

    function solve(row: number): void {
        if (row === n) {
            steps.push({ type: "solution", board: [...board], row, col: -1, reason: `All ${n} queens placed — solution found!`, stackDepth: row });
            return;
        }
        steps.push({ type: "enter", board: [...board], row, col: -1, reason: `Entering row ${row}, trying columns 0–${n - 1}`, stackDepth: row });
        for (let col = 0; col < n; col++) {
            steps.push({ type: "check", board: [...board], row, col, reason: `Checking row ${row}, col ${col}`, stackDepth: row });
            if (isSafe(board, row, col)) {
                board[row] = col;
                steps.push({ type: "place", board: [...board], row, col, reason: `Placed queen at (${row}, ${col}) — no conflicts`, stackDepth: row });
                solve(row + 1);
                board[row] = -1;
                if (row < n - 1 || col < n - 1) {
                    steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking: removing queen from (${row}, ${col})`, stackDepth: row });
                }
            } else {
                const reasons: string[] = [];
                for (let r = 0; r < row; r++) {
                    if (board[r] === col) reasons.push(`same column as row ${r}`);
                    else if (Math.abs(board[r] - col) === Math.abs(r - row)) reasons.push(`diagonal attack from (${r}, ${board[r]})`);
                }
                steps.push({ type: "conflict", board: [...board], row, col, reason: `Conflict at (${row}, ${col}): ${reasons[0] ?? "blocked"}`, stackDepth: row });
            }
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all columns tried`, stackDepth: row });
    }

    solve(0);
    return steps;
}

// ─── Forward Checking Algorithm ──────────────────────────────────────────────

function buildStepsFC(n: number): Step[] {
    const steps: Step[] = [];
    const board = Array<number>(n).fill(-1);

    function solve(row: number, domains: Set<number>[]): void {
        if (row === n) {
            steps.push({ type: "solution", board: [...board], row, col: -1, reason: `All ${n} queens placed — solution found!`, stackDepth: row });
            return;
        }
        const validCols = Array.from(domains[row]).sort((a, b) => a - b);
        steps.push({ type: "enter", board: [...board], row, col: -1, reason: `Entering row ${row} — ${validCols.length} column(s) in domain`, stackDepth: row });

        for (const col of validCols) {
            steps.push({ type: "check", board: [...board], row, col, reason: `Checking row ${row}, col ${col}`, stackDepth: row });

            // Propagate: remove col and diagonals from all future rows' domains
            const newDomains = domains.map(s => new Set(s));
            let feasible = true;
            for (let r = row + 1; r < n; r++) {
                const diff = r - row;
                newDomains[r].delete(col);
                newDomains[r].delete(col - diff);
                newDomains[r].delete(col + diff);
                if (newDomains[r].size === 0) { feasible = false; break; }
            }

            if (feasible) {
                board[row] = col;
                steps.push({ type: "place", board: [...board], row, col, reason: `Placed at (${row}, ${col}) — all future rows still have valid columns`, stackDepth: row });
                solve(row + 1, newDomains);
                board[row] = -1;
                steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking from (${row}, ${col})`, stackDepth: row });
            } else {
                steps.push({ type: "conflict", board: [...board], row, col, reason: `Pruned (${row}, ${col}) — placing here wipes out a future row's domain`, stackDepth: row });
            }
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all ${validCols.length} domain columns tried`, stackDepth: row });
    }

    const initialDomains = Array.from({ length: n }, () => new Set(Array.from({ length: n }, (_, i) => i)));
    solve(0, initialDomains);
    return steps;
}

function getAllSolutions(n: number): number[][] {
    const solutions: number[][] = [];
    const board = Array<number>(n).fill(-1);
    function isSafe(row: number, col: number): boolean {
        for (let r = 0; r < row; r++) {
            if (board[r] === col) return false;
            if (Math.abs(board[r] - col) === Math.abs(r - row)) return false;
        }
        return true;
    }
    function solve(row: number): void {
        if (row === n) { solutions.push([...board]); return; }
        for (let col = 0; col < n; col++) {
            if (isSafe(row, col)) { board[row] = col; solve(row + 1); board[row] = -1; }
        }
    }
    solve(0);
    return solutions;
}

function getCellState(step: Step | undefined, row: number, col: number): CellState {
    if (!step) return "empty";
    const { type, board, row: sRow, col: sCol } = step;
    if (type === "solution") return board[row] === col ? "solution" : "empty";
    if (board[row] === col && row < sRow) return "queen";
    if (row === sRow) {
        if (col === sCol) {
            if (type === "check") return "checking";
            if (type === "conflict") return "conflict";
            if (type === "place") return "queen";
        }
        if (type === "backtrack" && col === sCol) return "backtrack";
    }
    return "empty";
}

// ─── Mini Board ───────────────────────────────────────────────────────────────

function MiniBoard({ board, totalSize = 90 }: { board: number[]; totalSize?: number }) {
    const n = board.length;
    const cell = Math.floor(totalSize / n);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {Array.from({ length: n }, (_, row) => (
                <div key={row} style={{ display: "flex", gap: 1 }}>
                    {Array.from({ length: n }, (_, col) => {
                        const isLight = (row + col) % 2 === 0;
                        const hasQueen = board[row] === col;
                        return (
                            <div key={col} style={{
                                width: cell, height: cell, borderRadius: 2,
                                background: hasQueen
                                    ? CELL.solutionBg
                                    : isLight ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.3)",
                                border: hasQueen ? `1px solid ${CELL.solutionBorder}` : "none",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: cell * 0.6, color: CELL.solutionText,
                            }}>
                                {hasQueen && "♛"}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// ─── Solutions Gallery ────────────────────────────────────────────────────────

interface SolutionsGalleryProps {
    n: number;
    solutions: number[][];
    onClose: () => void;
    onJumpTo: (board: number[]) => void;
}

function SolutionsGallery({ n, solutions, onClose, onJumpTo }: SolutionsGalleryProps) {
    const [selected, setSelected] = useState<number | null>(null);

    return (
        <div style={{
            minHeight: 500,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "var(--border-radius-lg)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "20px 12px",
        }}>
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-lg)",
                width: "100%", maxWidth: 580,
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px",
                    borderBottom: "0.5px solid var(--color-border-tertiary)",
                }}>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)" }}>
                            All solutions — N = {n}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                            {solutions.length} unique solution{solutions.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        fontSize: 20, lineHeight: 1, background: "transparent",
                        border: "none", cursor: "pointer", color: "var(--color-text-secondary)",
                        padding: "2px 8px", borderRadius: "var(--border-radius-md)",
                    }}>×</button>
                </div>

                {/* Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 8, padding: 14,
                    maxHeight: 360, overflowY: "auto",
                    background: "var(--color-background-secondary)",
                }}>
                    {solutions.map((sol, i) => (
                        <div
                            key={i}
                            onClick={() => setSelected(selected === i ? null : i)}
                            style={{
                                background: selected === i ? "var(--color-background-success)" : "var(--color-background-primary)",
                                border: selected === i
                                    ? "1.5px solid var(--color-border-success)"
                                    : "0.5px solid var(--color-border-tertiary)",
                                borderRadius: "var(--border-radius-md)",
                                padding: 8, cursor: "pointer",
                                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                                transition: "background 0.12s, border 0.12s",
                            }}
                        >
                            <div style={{
                                fontSize: 10, fontWeight: 500,
                                color: selected === i ? "var(--color-text-success)" : "var(--color-text-tertiary)",
                            }}>
                                #{i + 1}
                            </div>
                            <MiniBoard board={sol} totalSize={n * 12} />
                            <div style={{ fontSize: 9, color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
                                [{sol.join(",")}]
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: "10px 16px",
                    borderTop: "0.5px solid var(--color-border-tertiary)",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                    flexWrap: "wrap",
                }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {selected !== null ? `Solution #${selected + 1} selected — [${solutions[selected]!.join(", ")}]` : "Click a board to select it"}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                        {selected !== null && (
                            <button
                                onClick={() => { onJumpTo(solutions[selected]!); onClose(); }}
                                style={{
                                    padding: "5px 14px", fontSize: 12, borderRadius: "var(--border-radius-md)",
                                    border: "0.5px solid var(--color-border-success)",
                                    background: "var(--color-background-success)",
                                    color: "var(--color-text-success)", cursor: "pointer", fontWeight: 500,
                                }}
                            >
                                Jump to this solution ↗
                            </button>
                        )}
                        <button onClick={onClose} style={{
                            padding: "5px 14px", fontSize: 12, borderRadius: "var(--border-radius-md)",
                            border: "0.5px solid var(--color-border-secondary)",
                            background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer",
                        }}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Board ────────────────────────────────────────────────────────────────────

interface BoardProps { step: Step | undefined; n: number; }

function Board({ step, n }: BoardProps) {
    const cellSize = Math.min(52, Math.floor(280 / n));
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: n }, (_, row) => (
                <div key={row} style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: n }, (_, col) => {
                        const isLight = (row + col) % 2 === 0;
                        const state = getCellState(step, row, col);
                        const isActive = !!(step && step.row === row && step.col === col);

                        // Neutral squares: slightly transparent over the card bg so they work in both modes
                        let bg = isLight ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)";
                        let border = "none";
                        let color = "transparent";

                        if (state === "queen")     { bg = CELL.queenBg;     border = `1.5px solid ${CELL.queenBorder}`;    color = CELL.queenText; }
                        if (state === "checking")  { bg = CELL.checkingBg;  border = `1.5px solid ${CELL.checkingBorder}`; color = CELL.checkingText; }
                        if (state === "conflict")  { bg = CELL.conflictBg;  border = `1.5px solid ${CELL.conflictBorder}`; color = CELL.conflictText; }
                        if (state === "backtrack") { bg = CELL.backtrackBg; border = `1.5px solid ${CELL.backtrackBorder}`;color = CELL.backtrackText; }
                        if (state === "solution")  { bg = CELL.solutionBg;  border = `1.5px solid ${CELL.solutionBorder}`; color = CELL.solutionText; }

                        return (
                            <div key={col} style={{
                                width: cellSize, height: cellSize,
                                background: bg, border, borderRadius: 4,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: cellSize * 0.52, color,
                                transition: "background 0.15s, border 0.15s",
                                boxShadow: isActive ? "0 0 0 2px rgba(100,160,255,0.4)" : "none",
                            }}>
                                {(state === "queen" || state === "solution") && "♛"}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

// ─── Call Stack ───────────────────────────────────────────────────────────────

interface CallStackProps { step: Step | undefined; n: number; }

function CallStack({ step, n }: CallStackProps) {
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

interface DecisionLogProps { steps: Step[]; currentIdx: number; }

function DecisionLog({ steps, currentIdx }: DecisionLogProps) {
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

interface DecisionTreeProps { steps: Step[]; currentIdx: number; n: number; }

function DecisionTree({ steps, currentIdx, n }: DecisionTreeProps) {
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
                    { bg: "var(--color-background-info)",    border: "var(--color-border-info)",    label: "Active" },
                    { bg: "var(--color-background-danger)",  border: "var(--color-border-danger)",  label: "Conflict" },
                    { bg: "var(--color-background-success)", border: "var(--color-border-success)", label: "Solution" },
                    { bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)", label: "Unvisited" },
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

// ─── Stats Bar ────────────────────────────────────────────────────────────────

interface StatsBarProps {
    steps: Step[];
    currentIdx: number;
    onShowSolutions: () => void;
    solutionCount: number;
    solvedSoFar: number;
}

function StatsBar({ steps, currentIdx, onShowSolutions, solutionCount, solvedSoFar }: StatsBarProps) {
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

            {/* Solutions — clickable tile */}
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

// ─── Compare Helpers ──────────────────────────────────────────────────────────

function countStepStats(steps: Step[], upTo: number) {
    let checks = 0, placements = 0, conflicts = 0, backtracks = 0;
    for (let i = 0; i <= upTo; i++) {
        const t = steps[i].type;
        if (t === "check") checks++;
        if (t === "place") placements++;
        if (t === "conflict") conflicts++;
        if (t === "backtrack" || t === "exhaust") backtracks++;
    }
    return { checks, placements, conflicts, backtracks };
}

// ─── Method Side Panel ────────────────────────────────────────────────────────

interface MethodSideProps {
    method: MethodKey;
    steps: Step[];
    idx: number;
    n: number;
}

function MethodSide({ method, steps, idx, n }: MethodSideProps) {
    const meta = METHOD_META[method];
    const step = steps[idx] as Step | undefined;
    const stepMeta = step ? TYPE_META[step.type] : null;
    const stats = countStepStats(steps, idx);
    const progress = steps.length > 1 ? (idx / (steps.length - 1)) * 100 : 0;
    const done = idx >= steps.length - 1;

    return (
        <div style={{
            background: "var(--color-background-primary)",
            border: `1.5px solid ${meta.accentBorder}`,
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: meta.accent, flexShrink: 0 }} />
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: meta.accent }}>{meta.name}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{meta.desc}</div>
                </div>
                {done && (
                    <div style={{
                        marginLeft: "auto", fontSize: 10, fontWeight: 600,
                        padding: "2px 8px", borderRadius: 99,
                        background: meta.accentBg, color: meta.accent,
                        border: `0.5px solid ${meta.accentBorder}`,
                    }}>
                        Done
                    </div>
                )}
            </div>

            {/* Current event banner */}
            {step && stepMeta && (
                <div style={{
                    padding: "5px 10px", fontSize: 11,
                    background: stepMeta.tagBg, border: `0.5px solid ${stepMeta.tagBorder}`,
                    borderRadius: "var(--border-radius-md)", color: stepMeta.tagText, fontWeight: 500,
                }}>
                    {step.reason}
                </div>
            )}

            {/* Board */}
            <div style={{ display: "flex", justifyContent: "center" }}>
                <Board step={step} n={n} />
            </div>

            {/* Progress bar */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                    <span>Step {idx} / {steps.length - 1}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 5, background: "var(--color-background-secondary)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: meta.accent, borderRadius: 99, transition: "width 0.1s" }} />
                </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {([
                    { label: "Checks",     value: stats.checks,     color: "var(--color-text-primary)",  bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)" },
                    { label: "Placed",     value: stats.placements, color: "var(--color-text-success)", bg: "var(--color-background-success)",   border: "var(--color-border-success)" },
                    { label: "Conflicts",  value: stats.conflicts,  color: "var(--color-text-danger)",  bg: "var(--color-background-danger)",    border: "var(--color-border-danger)" },
                    { label: "Backtracks", value: stats.backtracks, color: "var(--color-text-warning)", bg: "var(--color-background-warning)",   border: "var(--color-border-warning)" },
                ] as const).map(({ label, value, color, bg, border }) => (
                    <div key={label} style={{
                        textAlign: "center", padding: "5px 2px",
                        background: bg, border: `0.5px solid ${border}`,
                        borderRadius: "var(--border-radius-md)",
                    }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color }}>{value}</div>
                        <div style={{ fontSize: 9, color, opacity: 0.65, marginTop: 1 }}>{label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Comparison Bar ───────────────────────────────────────────────────────────

interface ComparisonBarProps { btSteps: Step[]; fcSteps: Step[]; btIdx: number; fcIdx: number; n: number; }

function ComparisonBar({ btSteps, fcSteps, btIdx, fcIdx, n }: ComparisonBarProps) {
    const btTotal = btSteps.length - 1;
    const fcTotal = fcSteps.length - 1;
    const maxTotal = Math.max(btTotal, fcTotal);
    const savingPct = Math.round((1 - fcTotal / btTotal) * 100);

    const btFinalStats = countStepStats(btSteps, btTotal);
    const fcFinalStats = countStepStats(fcSteps, fcTotal);

    const metrics: { label: string; bt: number; fc: number; color: string }[] = [
        { label: "Total steps",  bt: btTotal,                fc: fcTotal,                color: "var(--color-text-primary)" },
        { label: "Checks",       bt: btFinalStats.checks,     fc: fcFinalStats.checks,     color: "var(--color-text-primary)" },
        { label: "Conflicts",    bt: btFinalStats.conflicts,  fc: fcFinalStats.conflicts,  color: "var(--color-text-danger)" },
        { label: "Backtracks",   bt: btFinalStats.backtracks, fc: fcFinalStats.backtracks, color: "var(--color-text-warning)" },
    ];

    return (
        <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
        }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>
                Efficiency comparison
            </div>

            {/* Two progress bars side by side showing total steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {(["bt", "fc"] as MethodKey[]).map(m => {
                    const meta = METHOD_META[m];
                    const total = m === "bt" ? btTotal : fcTotal;
                    const cur   = m === "bt" ? btIdx   : fcIdx;
                    const frac  = total / maxTotal * 100;
                    const curFrac = total > 0 ? (cur / total) * frac : 0;
                    return (
                        <div key={m}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                <span style={{ color: meta.accent, fontWeight: 600 }}>{meta.name}</span>
                                <span style={{ color: "var(--color-text-secondary)" }}>{total} steps total</span>
                            </div>
                            <div style={{ height: 10, background: "var(--color-background-secondary)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                                {/* max track */}
                                <div style={{ position: "absolute", height: "100%", width: `${frac}%`, background: meta.accentBg, borderRadius: 99 }} />
                                {/* progress so far */}
                                <div style={{ position: "absolute", height: "100%", width: `${curFrac}%`, background: meta.accent, borderRadius: 99, opacity: 0.85, transition: "width 0.1s" }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Metric table */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(2, 80px)", gap: "4px 8px", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 600 }}> </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: METHOD_META.bt.accent, textAlign: "right" }}>BT</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: METHOD_META.fc.accent, textAlign: "right" }}>FC</div>
                {metrics.map(({ label, bt, fc }) => {
                    const diff = bt - fc;
                    const better = diff > 0;
                    return (
                        <>
                            <div key={label + "l"} style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
                            <div key={label + "bt"} style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", textAlign: "right" }}>{bt}</div>
                            <div key={label + "fc"} style={{ fontSize: 12, fontWeight: 500, color: better ? "var(--color-text-success)" : "var(--color-text-primary)", textAlign: "right" }}>
                                {fc}
                                {better && <span style={{ fontSize: 9, marginLeft: 3, color: "var(--color-text-success)" }}>−{diff}</span>}
                            </div>
                        </>
                    );
                })}
            </div>

            {/* Summary sentence */}
            <div style={{
                marginTop: 10, padding: "6px 10px",
                background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)",
                borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-success)", fontWeight: 500,
            }}>
                Forward Checking uses {savingPct}% fewer steps than Backtracking for N = {n}
            </div>
        </div>
    );
}

// ─── Compare View ─────────────────────────────────────────────────────────────

interface CompareViewProps { n: number; speed: SpeedKey; }

function CompareView({ n, speed }: CompareViewProps) {
    const btSteps = useMemo(() => buildSteps(n), [n]);
    const fcSteps = useMemo(() => buildStepsFC(n), [n]);
    const [btIdx, setBtIdx] = useState(0);
    const [fcIdx, setFcIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { setBtIdx(0); setFcIdx(0); setPlaying(false); }, [n]);

    const btDone = btIdx >= btSteps.length - 1;
    const fcDone = fcIdx >= fcSteps.length - 1;

    useEffect(() => {
        if (btDone && fcDone) setPlaying(false);
    }, [btDone, fcDone]);

    useEffect(() => {
        if (playing) {
            intervalRef.current = setInterval(() => {
                setBtIdx(i => Math.min(i + 1, btSteps.length - 1));
                setFcIdx(i => Math.min(i + 1, fcSteps.length - 1));
            }, SPEED_MS[speed]);
        } else {
            if (intervalRef.current !== null) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
    }, [playing, speed, btSteps.length, fcSteps.length]);

    const reset = () => { setBtIdx(0); setFcIdx(0); setPlaying(false); };
    const togglePlay = () => {
        if (btDone && fcDone) { reset(); setPlaying(true); return; }
        setPlaying(p => !p);
    };
    const stepBoth = () => {
        setBtIdx(i => Math.min(i + 1, btSteps.length - 1));
        setFcIdx(i => Math.min(i + 1, fcSteps.length - 1));
    };
    const backBoth = () => {
        setBtIdx(i => Math.max(i - 1, 0));
        setFcIdx(i => Math.max(i - 1, 0));
    };

    const btnBase: CSSProperties = {
        padding: "6px 12px", fontSize: 12, cursor: "pointer",
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "transparent", color: "var(--color-text-primary)",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Playback controls */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "10px 14px",
                display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
            }}>
                <button onClick={togglePlay} style={{
                    ...btnBase,
                    border: "0.5px solid var(--color-border-info)",
                    background: "var(--color-background-info)",
                    color: "var(--color-text-info)", fontWeight: 600,
                    padding: "6px 16px", fontSize: 13,
                }}>
                    {playing ? "⏸ Pause" : (btDone && fcDone) ? "↺ Replay race" : "▶ Start race"}
                </button>
                <button onClick={backBoth} disabled={btIdx === 0 && fcIdx === 0} style={btnBase}>◀ Back</button>
                <button onClick={stepBoth} disabled={btDone && fcDone} style={btnBase}>Step ▶</button>
                <button onClick={reset} style={btnBase}>↺ Reset</button>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                    Both algorithms advance at the same speed — forward checking finishes first
                </div>
            </div>

            {/* Side-by-side boards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                <MethodSide method="bt" steps={btSteps} idx={btIdx} n={n} />
                <MethodSide method="fc" steps={fcSteps} idx={fcIdx} n={n} />
            </div>

            {/* Efficiency comparison */}
            <ComparisonBar btSteps={btSteps} fcSteps={fcSteps} btIdx={btIdx} fcIdx={fcIdx} n={n} />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NQueensVisualizer() {
    const [n, setN] = useState<number>(6);
    const [steps, setSteps] = useState<Step[]>(() => buildSteps(6));
    const [allSolutions, setAllSolutions] = useState<number[][]>(() => getAllSolutions(6));
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [playing, setPlaying] = useState<boolean>(false);
    const [speed, setSpeed] = useState<SpeedKey>("medium");
    const [activeTab, setActiveTab] = useState<TabKey>("log");
    const [showGallery, setShowGallery] = useState<boolean>(false);
    const [mode, setMode] = useState<"single" | "compare">("single");
    const [method, setMethod] = useState<MethodKey>("bt");
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setSteps(method === "bt" ? buildSteps(n) : buildStepsFC(n));
        setAllSolutions(getAllSolutions(n));
        setCurrentIdx(0);
        setPlaying(false);
        setShowGallery(false);
    }, [n, method]);

    const step = steps[currentIdx] as Step | undefined;
    const solvedSoFar = steps.slice(0, currentIdx + 1).filter(s => s.type === "solution").length;

    const jumpToSolution = useCallback((board: number[]) => {
        const idx = steps.findIndex(s => s.type === "solution" && s.board.every((v, i) => v === board[i]));
        if (idx !== -1) { setCurrentIdx(idx); setPlaying(false); }
    }, [steps]);

    const advance = useCallback(() => {
        setCurrentIdx(i => {
            if (i >= steps.length - 1) { setPlaying(false); return i; }
            return i + 1;
        });
    }, [steps.length]);

    useEffect(() => {
        if (playing) {
            intervalRef.current = setInterval(advance, SPEED_MS[speed]);
        } else {
            if (intervalRef.current !== null) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
    }, [playing, speed, advance]);

    const reset = () => { setCurrentIdx(0); setPlaying(false); };
    const togglePlay = () => {
        if (currentIdx >= steps.length - 1) { setCurrentIdx(0); setPlaying(true); return; }
        setPlaying(p => !p);
    };

    const progress = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 0;

    const card = (children: ReactNode, style: CSSProperties = {}) => (
        <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
            ...style,
        }}>
            {children}
        </div>
    );

    const sectionLabel = (text: string) => (
        <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            {text}
        </div>
    );

    const tabs: TabKey[] = ["log", "stack", "tree"];
    const tabLabels: Record<TabKey, string> = { log: "Decision log", stack: "Call stack", tree: "Tree view" };

    const btnBase: CSSProperties = {
        padding: "6px 12px", fontSize: 12,
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "transparent", cursor: "pointer",
        color: "var(--color-text-primary)",
    };

    return (
        <div style={{ fontFamily: "var(--font-sans)", padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Controls */}
            {card(
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        {/* Mode toggle */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Mode</span>
                            {(["single", "compare"] as const).map(m => (
                                <button key={m} onClick={() => setMode(m)} style={{
                                    padding: "3px 11px", fontSize: 12,
                                    borderRadius: "var(--border-radius-md)",
                                    border: mode === m ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                                    background: mode === m ? "var(--color-background-info)" : "transparent",
                                    color: mode === m ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                    cursor: "pointer", fontWeight: mode === m ? 700 : 400,
                                    boxShadow: mode === m ? "0 0 0 2px var(--color-border-info)" : "none",
                                    transform: mode === m ? "scale(1.08)" : "scale(1)",
                                    transition: "all 0.1s",
                                }}>
                                    {m === "single" ? "Single" : "Compare"}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>N =</span>
                            {([4, 5, 6, 7, 8] as number[]).map(v => (
                                <button key={v} onClick={() => setN(v)} style={{
                                    padding: "3px 10px", fontSize: 13,
                                    borderRadius: "var(--border-radius-md)",
                                    border: n === v ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                                    background: n === v ? "var(--color-background-info)" : "transparent",
                                    color: n === v ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                    cursor: "pointer", fontWeight: n === v ? 700 : 400,
                                    boxShadow: n === v ? "0 0 0 2px var(--color-border-info)" : "none",
                                    transform: n === v ? "scale(1.08)" : "scale(1)",
                                    transition: "all 0.1s",
                                }}>
                                    {v}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Speed</span>
                            {(Object.keys(SPEED_MS) as SpeedKey[]).map(s => (
                                <button key={s} onClick={() => setSpeed(s)} style={{
                                    padding: "3px 8px", fontSize: 11,
                                    borderRadius: "var(--border-radius-md)",
                                    border: speed === s ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                                    background: speed === s ? "var(--color-background-info)" : "transparent",
                                    color: speed === s ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                    cursor: "pointer", fontWeight: speed === s ? 700 : 400,
                                    boxShadow: speed === s ? "0 0 0 2px var(--color-border-info)" : "none",
                                    transform: speed === s ? "scale(1.08)" : "scale(1)",
                                    transition: "all 0.1s",
                                }}>
                                    {s === "vfast" ? "max" : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === "single" && <>
                        {/* Method selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Algorithm</span>
                            {(["bt", "fc"] as MethodKey[]).map(m => {
                                const meta = METHOD_META[m];
                                const isActive = method === m;
                                return (
                                    <button key={m} onClick={() => setMethod(m)} style={{
                                        padding: "3px 10px", fontSize: 11,
                                        borderRadius: "var(--border-radius-md)",
                                        border: isActive ? `1.5px solid ${meta.accentBorder}` : "0.5px solid var(--color-border-secondary)",
                                        background: isActive ? meta.accentBg : "transparent",
                                        color: isActive ? meta.accent : "var(--color-text-secondary)",
                                        cursor: "pointer", fontWeight: isActive ? 700 : 400,
                                        boxShadow: isActive ? `0 0 0 2px ${meta.accentBorder}` : "none",
                                        transform: isActive ? "scale(1.08)" : "scale(1)",
                                        transition: "all 0.1s",
                                    }}>
                                        {meta.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={togglePlay} style={{
                                ...btnBase,
                                border: "0.5px solid var(--color-border-info)",
                                background: "var(--color-background-info)",
                                color: "var(--color-text-info)", fontWeight: 500,
                                padding: "6px 16px", fontSize: 13,
                            }}>
                                {playing ? "⏸ Pause" : currentIdx >= steps.length - 1 ? "↺ Replay" : "▶ Play"}
                            </button>
                            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} style={btnBase}>◀ Back</button>
                            <button onClick={advance} disabled={currentIdx >= steps.length - 1} style={btnBase}>Step ▶</button>
                            <button onClick={reset} style={btnBase}>↺ Reset</button>
                        </div>

                        <div>
                            <input
                                type="range" min={0} max={steps.length - 1} value={currentIdx} step={1}
                                onChange={e => { setCurrentIdx(Number(e.target.value)); setPlaying(false); }}
                                style={{ width: "100%" }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                                <span>step {currentIdx}</span>
                                <span>{Math.round(progress)}%</span>
                                <span>{steps.length - 1} total</span>
                            </div>
                        </div>
                    </>}
                </div>
            )}

            {/* ── Compare mode ─────────────────────────────────────────────── */}
            {mode === "compare" && <CompareView n={n} speed={speed} />}

            {/* ── Single mode ──────────────────────────────────────────────── */}
            {mode === "single" && <>
            <StatsBar
                steps={steps}
                currentIdx={currentIdx}
                onShowSolutions={() => setShowGallery(true)}
                solutionCount={allSolutions.length}
                solvedSoFar={solvedSoFar}
            />

            {/* Solutions gallery — replaces main view when open */}
            {showGallery && (
                <SolutionsGallery
                    n={n}
                    solutions={allSolutions}
                    onClose={() => setShowGallery(false)}
                    onJumpTo={jumpToSolution}
                />
            )}

            {!showGallery && (
                <>
                    {/* Current event banner */}
                    {step && (
                        <div style={{
                            padding: "8px 12px",
                            background: TYPE_META[step.type].tagBg,
                            borderRadius: "var(--border-radius-md)",
                            border: "0.5px solid",
                            borderColor: TYPE_META[step.type].tagBorder,
                            fontSize: 13,
                            color: TYPE_META[step.type].tagText,
                            fontWeight: 500,
                        }}>
                            {step.reason}
                        </div>
                    )}

                    {/* Board + right panel */}
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
                        {card(<Board step={step} n={n} />, { display: "inline-block" })}

                        {card(
                            <div>
                                <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
                                    {tabs.map(t => (
                                        <button key={t} onClick={() => setActiveTab(t)} style={{
                                            padding: "4px 12px", fontSize: 12, borderRadius: 99,
                                            border: activeTab === t ? "0.5px solid var(--color-border-info)" : "0.5px solid transparent",
                                            background: activeTab === t ? "var(--color-background-info)" : "transparent",
                                            color: activeTab === t ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                            cursor: "pointer", fontWeight: activeTab === t ? 500 : 400,
                                        }}>
                                            {tabLabels[t]}
                                        </button>
                                    ))}
                                </div>
                                {activeTab === "log" && (
                                    <>{sectionLabel("Most recent events")}<DecisionLog steps={steps} currentIdx={currentIdx} /></>
                                )}
                                {activeTab === "stack" && (
                                    <>{sectionLabel(`Stack depth: ${step ? step.stackDepth + 1 : 0}`)}<CallStack step={step} n={n} /></>
                                )}
                                {activeTab === "tree" && (
                                    <>{sectionLabel("Search space explored so far")}<DecisionTree steps={steps} currentIdx={currentIdx} n={n} /></>
                                )}
                            </div>
                            , { flex: 1 })}
                    </div>

                    {/* Legend */}
                    {card(
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                            {[
                                { bg: CELL.queenBg,     border: CELL.queenBorder,     text: CELL.queenText,     label: "Queen placed" },
                                { bg: CELL.checkingBg,  border: CELL.checkingBorder,  text: CELL.checkingText,  label: "Checking" },
                                { bg: CELL.conflictBg,  border: CELL.conflictBorder,  text: CELL.conflictText,  label: "Conflict" },
                                { bg: CELL.backtrackBg, border: CELL.backtrackBorder, text: CELL.backtrackText, label: "Backtracking" },
                                { bg: CELL.solutionBg,  border: CELL.solutionBorder,  text: CELL.solutionText,  label: "Solution" },
                            ].map(({ bg, border, text, label }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{
                                        width: 14, height: 14, borderRadius: 3,
                                        background: bg, border: `1px solid ${border}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 9, color: text,
                                    }}>
                                        {(label === "Queen placed" || label === "Solution") ? "♛" : ""}
                                    </div>
                                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
            </>}
        </div>
    );
}
