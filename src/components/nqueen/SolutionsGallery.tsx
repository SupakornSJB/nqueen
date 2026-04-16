import { useState } from "react";
import { MiniBoard } from "./Board";

interface SolutionsGalleryProps {
    n: number;
    solutions: number[][];
    onClose: () => void;
    onJumpTo: (board: number[]) => void;
}

export function SolutionsGallery({ n, solutions, onClose, onJumpTo }: SolutionsGalleryProps) {
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
