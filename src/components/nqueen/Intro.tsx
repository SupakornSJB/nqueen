import type { MethodKey } from "../../lib/types";
import { METHOD_META } from "../../lib/constants";

// A solved N=6 board used as the hero illustration
const EXAMPLE_BOARD = [1, 3, 5, 0, 2, 4];

function HeroBoard() {
    const n = EXAMPLE_BOARD.length;
    const cell = 38;
    return (
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: n }, (_, row) => (
                <div key={row} style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: n }, (_, col) => {
                        const isLight = (row + col) % 2 === 0;
                        const hasQueen = EXAMPLE_BOARD[row] === col;
                        return (
                            <div key={col} style={{
                                width: cell, height: cell, borderRadius: 4,
                                background: hasQueen
                                    ? "#0d3020"
                                    : isLight ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.22)",
                                border: `1.5px solid ${hasQueen ? "#1a6a50" : "transparent"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: cell * 0.52, color: "#9fe1cb",
                            }}>
                                {hasQueen ? "♛" : ""}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

const MODE_OVERVIEW: { key: string; label: string; emoji: string; desc: string }[] = [
    { key: "about",   label: "Algorithms", emoji: "≡",  desc: "Plain-English explanations of each algorithm with time complexity charts — expand any card to explore." },
    { key: "single",  label: "Single",  emoji: "▶",  desc: "Step through one algorithm frame by frame. Use the scrubber, playback buttons, and decision log to trace every move." },
    { key: "compare", label: "Compare", emoji: "⇆",  desc: "Race any two algorithms side-by-side at the same step pace. See which finishes first and why." },
    { key: "charts",  label: "Charts",  emoji: "▦",  desc: "Bar charts of steps, runtime (µs), efficiency, and conflict rate for all four algorithms across N = 4–8." },
    { key: "faq",     label: "FAQ",     emoji: "?",  desc: "Answers to common questions about the problem, the algorithms, and how to read the metrics." },
];

const ALGO_PILLS: { key: MethodKey; tag: string }[] = [
    { key: "bt", tag: "Naive Backtracking" },
    { key: "ht", tag: "Hash Backtracking" },
    { key: "fc", tag: "Forward Checking" },
    { key: "bm", tag: "Bitmask" },
];

interface IntroViewProps {
    onStart: () => void;
    onNavigate: (mode: string) => void;
}

export function IntroView({ onStart, onNavigate }: IntroViewProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Hero */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "28px 28px 24px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 28,
                alignItems: "center",
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    <h1 style={{
                        margin: "0 0 8px",
                        fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px",
                        color: "var(--color-text-primary)",
                    }}>
                        N-Queens Visualizer
                    </h1>
                    <p style={{
                        margin: "0 auto 16px",
                        fontSize: 14, lineHeight: 1.65,
                        color: "var(--color-text-secondary)",
                        maxWidth: 520,
                    }}>
                        Watch four algorithms solve the N-Queens puzzle step by step, compare their
                        efficiency, and understand the trade-offs between them.
                    </p>

                    {/* Algorithm pills */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, justifyContent: "center" }}>
                        {ALGO_PILLS.map(({ key, tag }) => {
                            const meta = METHOD_META[key];
                            return (
                                <span key={key} style={{
                                    fontSize: 11, fontWeight: 600,
                                    padding: "3px 10px", borderRadius: 99,
                                    background: meta.accentBg,
                                    color: meta.accent,
                                    border: `0.5px solid ${meta.accentBorder}`,
                                }}>
                                    {tag}
                                </span>
                            );
                        })}
                    </div>

                    <button
                        onClick={onStart}
                        style={{
                            padding: "8px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                            borderRadius: "var(--border-radius-md)",
                            border: "0.5px solid var(--color-border-info)",
                            background: "var(--color-background-info)",
                            color: "var(--color-text-info)",
                        }}
                    >
                        Start visualizing ▶
                    </button>
                </div>

                <HeroBoard />
            </div>

            {/* What is N-Queens */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "18px 20px",
            }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                    The problem
                </div>
                <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)", textAlign: "left" }}>
                    Place N chess queens on an N×N board so that no two queens share a row, column,
                    or diagonal — meaning every queen must be non-attacking. The board above shows
                    one of the 4 solutions for N = 6.
                </p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: "var(--color-text-secondary)", textAlign: "left" }}>
                    The puzzle appears simple but grows fast: N = 8 has 92 solutions spread across
                    a search space of over 16 million possible placements. This app makes the
                    exploration visible — you can watch every check, conflict, and backtrack happen
                    in real time at any speed.
                </p>
            </div>

            {/* Mode overview grid */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "18px 20px",
            }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                    What's inside
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                    {MODE_OVERVIEW.map(({ key, label, emoji, desc }) => (
                        <div key={key} onClick={() => onNavigate(key)} style={{
                            padding: "12px 14px",
                            background: "var(--color-background-secondary)",
                            border: "0.5px solid var(--color-border-tertiary)",
                            borderRadius: "var(--border-radius-md)",
                            cursor: "pointer",
                            transition: "border-color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-info)";
                            (e.currentTarget as HTMLDivElement).style.background = "var(--color-background-info)";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border-tertiary)";
                            (e.currentTarget as HTMLDivElement).style.background = "var(--color-background-secondary)";
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                                <span style={{
                                    fontSize: 13,
                                    width: 24, height: 24, borderRadius: "var(--border-radius-md)",
                                    background: "var(--color-background-primary)",
                                    border: "0.5px solid var(--color-border-secondary)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    {emoji}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                                    {label}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--color-text-secondary)", textAlign: "left" }}>
                                {desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}