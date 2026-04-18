import { describe, it, expect } from "vitest";
import { solveBT, solveHT, solveFC, solveBM, solve } from "../lib/solvers";
import type { MethodKey } from "../lib/types";

// Known solution counts for N-Queens (OEIS A000170)
const SOLUTION_COUNTS: Record<number, number> = {
    1: 1,
    2: 0,
    3: 0,
    4: 2,
    5: 10,
    6: 4,
    7: 40,
    8: 92,
};

// Checks that no two queens share a column, row, or diagonal
function isValidSolution(board: number[]): boolean {
    const n = board.length;
    for (let r = 0; r < n; r++) {
        for (let c = r + 1; c < n; c++) {
            // Same column
            if (board[r] === board[c]) return false;
            // Same diagonal
            if (Math.abs(board[r] - board[c]) === Math.abs(r - c)) return false;
        }
    }
    return true;
}

// Canonical form: sort boards so order doesn't matter when comparing two solvers
function canonical(solutions: number[][]): string {
    return solutions
        .map(b => b.join(","))
        .sort()
        .join("|");
}

// Run the same test suite against each solver implementation
const METHODS: [string, (n: number) => number[][]][] = [
    ["BT",  solveBT],
    ["HT",  solveHT],
    ["FC",  solveFC],
    ["BM",  solveBM],
];

for (const [name, solver] of METHODS) {
    describe(`${name} solver`, () => {

        it("returns 1 solution for N=1", () => {
            const result = solver(1);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual([0]);
        });

        it("returns 0 solutions for N=2 and N=3", () => {
            expect(solver(2)).toHaveLength(0);
            expect(solver(3)).toHaveLength(0);
        });

        it("returns the correct solution count for N=4 through N=8", () => {
            for (const [nStr, expected] of Object.entries(SOLUTION_COUNTS)) {
                const n = Number(nStr);
                const result = solver(n);
                expect(result, `N=${n}`).toHaveLength(expected);
            }
        });

        it("every returned board has exactly N queens (one per row)", () => {
            const result = solver(6);
            for (const board of result) {
                // Each row has exactly one queen (board[row] = col)
                expect(board).toHaveLength(6);
                for (const col of board) {
                    expect(col).toBeGreaterThanOrEqual(0);
                    expect(col).toBeLessThan(6);
                }
            }
        });

        it("every returned board is a valid non-attacking placement", () => {
            const result = solver(8);
            for (const board of result) {
                expect(isValidSolution(board), `invalid board: [${board}]`).toBe(true);
            }
        });

        it("produces no duplicate solutions for N=8", () => {
            const result = solver(8);
            const unique = new Set(result.map(b => b.join(",")));
            expect(unique.size).toBe(result.length);
        });
    });
}

// All four solvers must agree on the exact same set of solutions
describe("Cross-solver consistency", () => {
    for (const n of [4, 5, 6, 7]) {
        it(`all four solvers return identical solution sets for N=${n}`, () => {
            const ref = canonical(solveBT(n));
            expect(canonical(solveHT(n)), "HT vs BT").toBe(ref);
            expect(canonical(solveFC(n)), "FC vs BT").toBe(ref);
            expect(canonical(solveBM(n)), "BM vs BT").toBe(ref);
        });
    }
});

// Dispatcher routes to the correct implementation
describe("solve() dispatcher", () => {
    const methods: MethodKey[] = ["bt", "ht", "fc", "bm"];
    for (const method of methods) {
        it(`routes "${method}" and returns 92 solutions for N=8`, () => {
            expect(solve(method, 8)).toHaveLength(92);
        });
    }
});