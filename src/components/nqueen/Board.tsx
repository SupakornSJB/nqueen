import type { Step } from "../../lib/types";
import { CELL } from "../../lib/constants";
import { getCellState } from "../../lib/algorithms";

export function MiniBoard({ board, totalSize = 90 }: { board: number[]; totalSize?: number }) {
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
                                border: `1px solid ${hasQueen ? CELL.solutionBorder : "transparent"}`,
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

export function Board({ step, n }: { step: Step | undefined; n: number }) {
    const cellSize = Math.min(52, Math.floor(280 / n));
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: n }, (_, row) => (
                <div key={row} style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: n }, (_, col) => {
                        const isLight = (row + col) % 2 === 0;
                        const state = getCellState(step, row, col);
                        const isActive = !!(step && step.row === row && step.col === col);

                        let bg = isLight ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)";
                        let border = "1.5px solid transparent";
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
                                transition: "background 0.15s, border-color 0.15s",
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