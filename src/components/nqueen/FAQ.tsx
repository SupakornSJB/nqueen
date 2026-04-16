import { useState } from "react";

interface FaqItem { q: string; a: string; }
interface FaqSection { title: string; items: FaqItem[]; }

const SECTIONS: FaqSection[] = [
    {
        title: "The N-Queens Problem",
        items: [
            {
                q: "What is the N-Queens problem?",
                a: "Place N chess queens on an N×N board so no two queens share a row, column, or diagonal. Any two queens must be non-attacking. The challenge grows quickly with N — a brute-force search of all N² placements is infeasible, so constraint-based search is required.",
            },
            {
                q: "How many solutions exist for each N?",
                a: "N=1: 1  ·  N=2: 0  ·  N=3: 0  ·  N=4: 2  ·  N=5: 10  ·  N=6: 4  ·  N=7: 40  ·  N=8: 92  ·  N=9: 352. The count does not grow monotonically — N=6 has fewer solutions than N=5 due to the geometry of that board size.",
            },
            {
                q: "Is this problem computationally hard?",
                a: "Finding one solution is polynomial. Counting all solutions is #P-complete (believed harder than NP). For N ≤ 8 all solutions are found in milliseconds. For N ≈ 25 even modern computers need significant time for a complete search.",
            },
            {
                q: "What does a valid solution look like?",
                a: "A solution is an assignment of one column per row such that no two rows share a column or diagonal. It is represented as a length-N array, e.g. [1,3,0,2] for N=4, meaning row 0 places in col 1, row 1 in col 3, etc.",
            },
        ],
    },
    {
        title: "The Algorithms",
        items: [
            {
                q: "How does Backtracking work?",
                a: "Backtracking tries each column left-to-right in the current row. Before placing, it checks all previously placed queens for column or diagonal conflicts. If safe, it places the queen and recurses to the next row. If no column in a row is safe, it removes the previous queen and tries the next column there — the 'backtrack' step. It is correct and simple but explores many states that are doomed to fail.",
            },
            {
                q: "What does Forward Checking add?",
                a: "After placing a queen, Forward Checking propagates the constraints forward: it removes the newly attacked columns from the valid-column sets ('domains') of all future rows. If any future row's domain becomes empty, the placement is rejected immediately — no recursion needed. This 'look-ahead' pruning eliminates entire subtrees before they are explored, reducing the step count by 40–70% vs plain backtracking.",
            },
            {
                q: "How does the Bitmask approach work?",
                a: "Three integers represent attacked columns: cols (vertical), diag1 (left diagonal, shifts left each row), diag2 (right diagonal, shifts right each row). The safe columns for the current row are computed in O(1): safe = full & ~(cols | diag1 | diag2). Only the set bits in 'safe' are tried — invalid positions are never visited. This is why the bitmask approach has zero conflict steps in the trace.",
            },
            {
                q: "Why does Bitmask always show 0 conflicts?",
                a: "In Backtracking and Forward Checking, the algorithm checks a position and then decides whether to reject it. In Bitmask, only valid positions are enumerated in the first place — the mask pre-filters them. There is no 'check then reject' loop, so the conflict counter stays at zero by design.",
            },
            {
                q: "Are all three algorithms guaranteed to find all solutions?",
                a: "Yes. All three are complete — they explore the same solution set and find every valid placement. They differ only in how efficiently they prune the search space. The step counts differ, but the final solution sets are identical.",
            },
            {
                q: "Which algorithm should I use in practice?",
                a: "For competitive programming or maximum performance: Bitmask. For educational understanding of constraint propagation: Forward Checking. For the simplest implementation to study or verify: Backtracking. The bitmask version is the standard competitive-programming technique for N-Queens.",
            },
        ],
    },
    {
        title: "Reading the Metrics",
        items: [
            {
                q: "What do the step event types mean?",
                a: "Enter: the algorithm moves to a new row. Check: a candidate column is being evaluated. Place: a queen is placed successfully. Conflict: the candidate was rejected (BT/FC only). Backtrack: a queen is removed to try the next column. Exhaust: all candidates in a row failed, triggering a backtrack from the row above. Solution: all N queens are placed.",
            },
            {
                q: "What is 'check efficiency'?",
                a: "Check efficiency = placements ÷ checks × 100. It measures what fraction of evaluated positions led to a successful queen placement. Bitmask approaches 100% because every position it checks is guaranteed safe. Backtracking is lowest because many checks end in conflict rejection.",
            },
            {
                q: "What is 'conflict rate'?",
                a: "Conflict rate = conflicts ÷ checks × 100. It measures what fraction of position checks were wasted — checked and then rejected. Bitmask is always 0%. Backtracking is highest. Forward Checking is intermediate because domain propagation removes the most obvious conflicts but not all.",
            },
            {
                q: "What does 'candidates / row' mean?",
                a: "Average candidates tried per row = total checks ÷ N. Backtracking always tries all N columns per row regardless of feasibility, so this equals N. Bitmask tries only the pre-computed safe positions — at N=8, typically 4–5 instead of 8. Forward Checking is between the two.",
            },
            {
                q: "Why does the total step count grow so fast with N?",
                a: "The N-Queens search space is O(N!) in the worst case. Even with pruning, the number of recursive calls grows super-exponentially. Each increment in N roughly multiplies the step count by 5–10×, which is why N=8 has thousands of times more steps than N=4.",
            },
            {
                q: "Why is Forward Checking sometimes slower in wall-clock time than Backtracking, even though it has fewer steps?",
                a: "Step count measures the number of algorithm events, not the cost of each event. Forward Checking visits fewer nodes, but each node does more work: before recursing it copies the valid-column sets ('domains') for all N future rows. That copy operation is O(N²) per placement. At small N (4–5), the per-node overhead from these copies exceeds the savings from visiting fewer nodes, so FC wall-clock time can be higher than BT despite a lower step count. At N=7–8, the branch pruning is so aggressive that total work finally drops below BT. Bitmask avoids both the O(row) conflict scan of BT and the domain copying of FC, which is why it is fastest at every N.",
            },
        ],
    },
    {
        title: "Using the Visualizer",
        items: [
            {
                q: "What is Compare mode for?",
                a: "Compare mode runs two algorithms side-by-side at the same step cadence. The one with fewer total steps finishes first. Use it to see how much faster Forward Checking or Bitmask prunes compared to plain Backtracking on the same board.",
            },
            {
                q: "What is the Call Stack tab showing?",
                a: "Each frame represents one active recursive call to solve(row). The top frame is the deepest recursion level currently executing. When a backtrack happens, the top frame is popped. This lets you see the recursion depth and which rows currently have queens placed.",
            },
            {
                q: "What is the Decision Tree showing?",
                a: "The tree visualizes which (row, column) cells have been visited and their outcome. Blue = active or placed, red = conflict, green = part of a solution, grey = not yet visited. It's limited to N ≤ 6 because larger boards produce too many nodes to render clearly.",
            },
            {
                q: "Why does the 'Solutions' button in Single mode show a fraction?",
                a: "It shows solutions found so far ÷ total solutions for this N. As the animation progresses and the algorithm hits 'solution' steps, the numerator increases. Click the button to open the gallery of all solutions with miniboard previews.",
            },
        ],
    },
];

export function FaqView() {
    const [openItem, setOpenItem] = useState<string | null>(null);

    const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SECTIONS.map(section => (
                <div key={section.title} style={{
                    background: "var(--color-background-primary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-lg)",
                    overflow: "hidden",
                }}>
                    <div style={{
                        padding: "10px 16px",
                        borderBottom: "0.5px solid var(--color-border-tertiary)",
                        fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)",
                        background: "var(--color-background-secondary)",
                        letterSpacing: "0.04em",
                    }}>
                        {section.title}
                    </div>
                    {section.items.map((item, i) => {
                        const key = `${section.title}-${i}`;
                        const isOpen = openItem === key;
                        return (
                            <div key={key} style={{
                                borderBottom: i < section.items.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                            }}>
                                <button
                                    onClick={() => toggle(key)}
                                    style={{
                                        width: "100%", textAlign: "left",
                                        padding: "11px 16px",
                                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                                        background: isOpen ? "var(--color-background-info)" : "transparent",
                                        border: "none", cursor: "pointer",
                                        transition: "background 0.12s",
                                    }}
                                >
                                    <span style={{
                                        fontSize: 13, fontWeight: isOpen ? 600 : 400,
                                        color: isOpen ? "var(--color-text-info)" : "var(--color-text-primary)",
                                    }}>
                                        {item.q}
                                    </span>
                                    <span style={{
                                        fontSize: 16, lineHeight: 1, flexShrink: 0,
                                        color: isOpen ? "var(--color-text-info)" : "var(--color-text-tertiary)",
                                        transform: isOpen ? "rotate(45deg)" : "none",
                                        transition: "transform 0.15s",
                                        display: "inline-block",
                                    }}>
                                        +
                                    </span>
                                </button>
                                {isOpen && (
                                    <div style={{
                                        padding: "0 16px 14px 16px",
                                        borderTop: "0.5px solid var(--color-border-info)",
                                    }}>
                                        <p style={{
                                            margin: "10px 0 0",
                                            fontSize: 13, lineHeight: 1.65,
                                            color: "var(--color-text-secondary)",
                                            textAlign: "left",
                                        }}>
                                            {item.a}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}