import { useState } from "react";
import type { MethodKey } from "../../lib/types";
import { METHOD_META } from "../../lib/constants";

interface AlgoDesc {
    complexity: string;
    paragraphs: string[];
    comparison: string;
}

const DESCRIPTIONS: Record<MethodKey, AlgoDesc> = {
    bt: {
        complexity: "O(N!) time  ·  O(N) space",
        paragraphs: [
            "Backtracking is the simplest correct approach to the N-Queens problem. It works row by row: for each row it tries every column from left to right. Before placing a queen it scans all queens already placed and checks for column or diagonal conflicts — if none exist, the queen is placed and the algorithm recurses to the next row.",
            "When no column in the current row is safe, the algorithm backtracks: it removes the queen placed in the previous row and resumes trying the next column from where it left off. This continues until all N queens are placed (a solution is found) or every possibility is exhausted.",
            "The key weakness is that it reacts to conflicts only after they occur. Every column in every row is evaluated, including many that are doomed to fail. For N = 8 this means hundreds of thousands of individual checks.",
        ],
        comparison: "vs Forward Checking: BT generates roughly 3–4× more steps at N=8 because it never prunes based on future feasibility. vs Bitmask: BT generates 4–6× more steps because it checks invalid positions explicitly. BT has the highest conflict rate of all three algorithms.",
    },
    fc: {
        complexity: "O(N!) time  ·  O(N²) space",
        paragraphs: [
            "Forward Checking extends backtracking with a look-ahead step. Before recursing, it simulates the placement and removes the newly attacked squares from the valid-column sets ('domains') of all future rows. If any future row ends up with an empty domain — meaning no column would be legally available — the placement is immediately rejected without ever recursing into it.",
            "This early pruning eliminates large subtrees from the search space before they are explored. Rows that backtracking would visit thousands of times are cut off as soon as they become unsatisfiable, which is why the step count is substantially lower than plain backtracking.",
            "The trade-off is memory: forward checking must copy the domain sets on each recursive call (O(N²) per level), whereas backtracking needs only O(N) for the board array. For small N the extra memory is negligible, but it grows with problem size.",
        ],
        comparison: "vs Backtracking: FC uses roughly 3–4× fewer steps at N=8 due to look-ahead pruning. vs Bitmask: FC uses 1.5–2.5× more steps because it still iterates over domain candidates explicitly and copies domain arrays. FC's conflict rate is lower than BT but non-zero; Bitmask's is always 0%.",
    },
    bm: {
        complexity: "O(N!) time  ·  O(N) space",
        paragraphs: [
            "The Bitmask approach represents attacked columns as integers. Three bitmasks track which columns are blocked: cols for vertical attacks, diag1 for left-leaning diagonals, and diag2 for right-leaning diagonals. For any given row, all safe columns are computed in a single bitwise operation: full & ~(cols | diag1 | diag2), where full is a mask of all N column bits.",
            "Only positions present in that bitmask are ever visited — the algorithm never checks a cell only to reject it. When moving to the next row the diagonal masks are each shifted by one bit to account for the row offset. This means zero explicit conflict-checking steps appear in the trace; the mask pre-filters them out entirely.",
            "Because every operation is O(1) bit arithmetic, and no invalid positions are visited, the bitmask approach has the smallest step count of the three methods shown here. It is the standard technique used in competitive-programming solutions where N-Queens needs to run at maximum speed.",
        ],
        comparison: "Bitmask has the fewest steps of all three. Its conflict rate is always 0% and its check efficiency approaches 100% because only valid positions are tried. At N=8, BM uses roughly 4–6× fewer steps than BT and 1.5–2.5× fewer than FC.",
    },
};

export function AboutView() {
    const [expanded, setExpanded] = useState<MethodKey | null>(null);
    const methods: MethodKey[] = ["bt", "fc", "bm"];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {methods.map(m => {
                const meta = METHOD_META[m];
                const desc = DESCRIPTIONS[m];
                const isExpanded = expanded === m;

                return (
                    <div
                        key={m}
                        onClick={() => setExpanded(isExpanded ? null : m)}
                        style={{
                            background: "var(--color-background-primary)",
                            border: `1.5px solid ${isExpanded ? meta.accent : meta.accentBorder}`,
                            borderRadius: "var(--border-radius-lg)",
                            padding: isExpanded ? "22px 24px" : "18px 20px",
                            display: "flex", flexDirection: "column", gap: isExpanded ? 14 : 12,
                            cursor: "pointer",
                            transition: "padding 0.15s, border-color 0.15s",
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: meta.accent, flexShrink: 0 }} />
                                    <span style={{ fontSize: isExpanded ? 17 : 16, fontWeight: 700, color: meta.accent }}>{meta.name}</span>
                                </div>
                                <span style={{
                                    fontSize: 10, fontFamily: "var(--font-mono)",
                                    color: "var(--color-text-tertiary)",
                                    padding: "2px 8px", borderRadius: 99,
                                    background: "var(--color-background-secondary)",
                                    border: "0.5px solid var(--color-border-tertiary)",
                                }}>
                                    {desc.complexity}
                                </span>
                            </div>
                            <span style={{
                                fontSize: 11, color: isExpanded ? meta.accent : "var(--color-text-tertiary)",
                                transition: "color 0.15s", userSelect: "none",
                            }}>
                                {isExpanded ? "▲ collapse" : "▼ expand"}
                            </span>
                        </div>

                        {/* Paragraphs */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {desc.paragraphs.map((p, i) => (
                                <p key={i} style={{
                                    margin: 0,
                                    fontSize: isExpanded ? 14 : 13,
                                    lineHeight: 1.65,
                                    color: "var(--color-text-secondary)",
                                    textAlign: "left",
                                }}>
                                    {p}
                                </p>
                            ))}
                        </div>

                        {/* Comparison summary — only when expanded */}
                        {isExpanded && (
                            <div style={{
                                padding: "10px 14px",
                                background: meta.accentBg,
                                border: `0.5px solid ${meta.accentBorder}`,
                                borderRadius: "var(--border-radius-md)",
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 600, color: meta.accent, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                    Comparison summary
                                </div>
                                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: "var(--color-text-secondary)", textAlign: "left" }}>
                                    {desc.comparison}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}