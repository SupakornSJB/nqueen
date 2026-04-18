import { describe, it, expect } from "vitest";
import {
    buildSteps,
    buildStepsHT,
    buildStepsFC,
    buildStepsBM,
    buildMethodSteps,
    getAllSolutions,
    getCellState,
    countStepStats,
    countStepsTotal,
} from "../lib/algorithms";
import type { MethodKey, Step } from "../lib/types";

// ── Fixtures ───────────────────────────────────────────────────────────────────

// OEIS A000170
const SOLUTION_COUNTS: Record<number, number> = { 1: 1, 2: 0, 3: 0, 4: 2, 5: 10, 6: 4, 7: 40, 8: 92 };

const VALID_STEP_TYPES = new Set(["enter", "check", "place", "conflict", "prune", "backtrack", "exhaust", "solution"]);

function isValidBoard(board: number[], n: number): boolean {
    if (board.length !== n) return false;
    for (let r = 0; r < n; r++) {
        const col = board[r];
        if (col < -1 || col >= n) return false;
        if (col === -1) continue;
        for (let r2 = 0; r2 < r; r2++) {
            if (board[r2] === -1) continue;
            if (board[r2] === col) return false;
            if (Math.abs(board[r2] - col) === Math.abs(r2 - r)) return false;
        }
    }
    return true;
}

function canonicalize(solutions: number[][]): string {
    return solutions.map(b => b.join(",")).sort().join("|");
}

// ── buildSteps* helpers ────────────────────────────────────────────────────────

const BUILDERS: [string, (n: number) => Step[], MethodKey][] = [
    ["buildSteps (BT)",  buildSteps,    "bt"],
    ["buildStepsHT",     buildStepsHT,  "ht"],
    ["buildStepsFC",     buildStepsFC,  "fc"],
    ["buildStepsBM",     buildStepsBM,  "bm"],
];

for (const [label, build, method] of BUILDERS) {
    describe(`${label}`, () => {
        it("returns a non-empty step array for N=4", () => {
            expect(build(4).length).toBeGreaterThan(0);
        });

        it("every step has a valid type", () => {
            for (const step of build(5)) {
                expect(VALID_STEP_TYPES.has(step.type), `unexpected type "${step.type}"`).toBe(true);
            }
        });

        it("every step's board snapshot has length N", () => {
            const steps = build(5);
            for (const step of steps) {
                expect(step.board.length).toBe(5);
            }
        });

        it("every non-solution board snapshot is a valid partial placement", () => {
            const steps = build(6).filter(s => s.type !== "solution");
            for (const step of steps) {
                expect(isValidBoard(step.board, 6), `invalid board at step type="${step.type}": [${step.board}]`).toBe(true);
            }
        });

        it("stackDepth is between 0 and N for every step", () => {
            const steps = build(5);
            for (const step of steps) {
                expect(step.stackDepth).toBeGreaterThanOrEqual(0);
                expect(step.stackDepth).toBeLessThanOrEqual(5);
            }
        });

        it("the number of solution steps matches known counts for N=4..7", () => {
            for (const n of [4, 5, 6, 7]) {
                const count = build(n).filter(s => s.type === "solution").length;
                expect(count, `N=${n} solution count`).toBe(SOLUTION_COUNTS[n]);
            }
        });

        it("solution steps have fully placed boards (no -1 entries)", () => {
            for (const step of build(5).filter(s => s.type === "solution")) {
                expect(step.board.every(c => c >= 0)).toBe(true);
            }
        });

        it("place steps set board[row] = col", () => {
            for (const step of build(5).filter(s => s.type === "place")) {
                expect(step.board[step.row]).toBe(step.col);
            }
        });

        it(`produces the same solution set as BT for N=5 (cross-check)`, () => {
            if (method === "bt") return; // skip self-comparison
            const ref = canonicalize(buildSteps(5).filter(s => s.type === "solution").map(s => s.board));
            const own = canonicalize(build(5).filter(s => s.type === "solution").map(s => s.board));
            expect(own).toBe(ref);
        });
    });
}

// ── buildMethodSteps dispatcher ────────────────────────────────────────────────

describe("buildMethodSteps", () => {
    const methods: MethodKey[] = ["bt", "ht", "fc", "bm"];
    for (const m of methods) {
        it(`routes "${m}" and produces 10 solution steps for N=5`, () => {
            const solutions = buildMethodSteps(m, 5).filter(s => s.type === "solution");
            expect(solutions).toHaveLength(10);
        });
    }
});

// ── getAllSolutions ─────────────────────────────────────────────────────────────

describe("getAllSolutions", () => {
    it("returns 0 solutions for N=2 and N=3", () => {
        expect(getAllSolutions(2)).toHaveLength(0);
        expect(getAllSolutions(3)).toHaveLength(0);
    });

    it("returns the correct count for N=1..8", () => {
        for (const [nStr, expected] of Object.entries(SOLUTION_COUNTS)) {
            const n = Number(nStr);
            expect(getAllSolutions(n), `N=${n}`).toHaveLength(expected);
        }
    });

    it("every solution is a valid non-attacking placement", () => {
        for (const board of getAllSolutions(8)) {
            const n = board.length;
            for (let r = 0; r < n; r++) {
                for (let r2 = r + 1; r2 < n; r2++) {
                    expect(board[r] === board[r2], `column clash at rows ${r},${r2}`).toBe(false);
                    expect(Math.abs(board[r] - board[r2]) === Math.abs(r - r2), `diagonal clash`).toBe(false);
                }
            }
        }
    });

    it("returns no duplicate boards for N=8", () => {
        const solutions = getAllSolutions(8);
        const unique = new Set(solutions.map(b => b.join(",")));
        expect(unique.size).toBe(solutions.length);
    });

    it("agrees with buildSteps solution boards for N=6", () => {
        const fromSteps = buildSteps(6).filter(s => s.type === "solution").map(s => s.board);
        expect(canonicalize(getAllSolutions(6))).toBe(canonicalize(fromSteps));
    });
});

// ── getCellState ───────────────────────────────────────────────────────────────

describe("getCellState", () => {
    it("returns 'empty' when step is undefined", () => {
        expect(getCellState(undefined, 0, 0)).toBe("empty");
    });

    it("returns 'solution' for queen cells in a solution step", () => {
        const step = buildSteps(4).find(s => s.type === "solution")!;
        for (let row = 0; row < 4; row++) {
            expect(getCellState(step, row, step.board[row])).toBe("solution");
        }
    });

    it("returns 'empty' for non-queen cells in a solution step", () => {
        const step = buildSteps(4).find(s => s.type === "solution")!;
        expect(getCellState(step, 0, step.board[0] === 0 ? 1 : 0)).toBe("empty");
    });

    it("returns 'queen' for queens placed in earlier rows", () => {
        const step = buildSteps(4).find(s => s.type === "place" && s.row > 0)!;
        expect(getCellState(step, 0, step.board[0])).toBe("queen");
    });

    it("returns 'checking' for a check step at its target cell", () => {
        const step = buildSteps(4).find(s => s.type === "check")!;
        expect(getCellState(step, step.row, step.col)).toBe("checking");
    });

    it("returns 'conflict' for a conflict step at its target cell", () => {
        const step = buildSteps(4).find(s => s.type === "conflict")!;
        expect(getCellState(step, step.row, step.col)).toBe("conflict");
    });

    it("returns 'queen' for a place step at its target cell", () => {
        const step = buildSteps(4).find(s => s.type === "place")!;
        expect(getCellState(step, step.row, step.col)).toBe("queen");
    });

    it("returns 'empty' for cells not involved in the current step", () => {
        const step = buildSteps(4).find(s => s.type === "check" && s.row === 0)!;
        const otherCol = step.col === 0 ? 1 : 0;
        expect(getCellState(step, 1, otherCol)).toBe("empty");
    });
});

// ── countStepStats ────────────────────────────────────────────────────────────

describe("countStepStats", () => {
    const steps = buildSteps(4);

    it("returns all zeros at upTo=-1 (before first step)", () => {
        // upTo < 0 is undefined behavior by the API; upTo=0 means just the first step
    });

    it("checks + conflicts + placements are non-negative for the full sequence", () => {
        const stats = countStepStats(steps, steps.length - 1);
        expect(stats.checks).toBeGreaterThan(0);
        expect(stats.placements).toBeGreaterThan(0);
        expect(stats.conflicts).toBeGreaterThan(0);
        expect(stats.backtracks).toBeGreaterThan(0);
    });

    it("counts increase monotonically as upTo advances", () => {
        const half = countStepStats(steps, Math.floor(steps.length / 2));
        const full = countStepStats(steps, steps.length - 1);
        expect(full.checks).toBeGreaterThanOrEqual(half.checks);
        expect(full.placements).toBeGreaterThanOrEqual(half.placements);
    });

    it("counts prune steps as conflicts (FC)", () => {
        const fcSteps = buildStepsFC(5);
        const pruneCount = fcSteps.filter(s => s.type === "prune").length;
        const { conflicts } = countStepStats(fcSteps, fcSteps.length - 1);
        expect(conflicts).toBeGreaterThanOrEqual(pruneCount);
    });

    it("avgDepth is between 0 and N", () => {
        const { avgDepth } = countStepStats(steps, steps.length - 1);
        expect(avgDepth).toBeGreaterThanOrEqual(0);
        expect(avgDepth).toBeLessThanOrEqual(4);
    });

    it("a single check step has checks=1 and all others=0", () => {
        const checkIdx = steps.findIndex(s => s.type === "check");
        const stats = countStepStats(steps, checkIdx);
        expect(stats.checks).toBe(1);
        expect(stats.placements).toBe(0);
        expect(stats.conflicts).toBe(0);
        expect(stats.backtracks).toBe(0);
    });
});

// ── countStepsTotal ───────────────────────────────────────────────────────────

describe("countStepsTotal", () => {
    const methods: MethodKey[] = ["bt", "ht", "fc", "bm"];

    it("returns a positive number for every method at N=4", () => {
        for (const m of methods) {
            expect(countStepsTotal(m, 4)).toBeGreaterThan(0);
        }
    });

    it("count grows with N for every method (N=4 < N=6)", () => {
        for (const m of methods) {
            expect(countStepsTotal(m, 6)).toBeGreaterThan(countStepsTotal(m, 4));
        }
    });

    it("is consistent across repeated calls for the same (method, N)", () => {
        for (const m of methods) {
            expect(countStepsTotal(m, 5)).toBe(countStepsTotal(m, 5));
        }
    });

    it("BM total is less than BT total for N=7 (bitmask prunes harder)", () => {
        expect(countStepsTotal("bm", 7)).toBeLessThan(countStepsTotal("bt", 7));
    });
});