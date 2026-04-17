import type { Step, CellState, MethodKey } from "./types";

// ─── Backtracking ─────────────────────────────────────────────────────────────

export function buildSteps(n: number): Step[] {
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

// ─── Forward Checking ─────────────────────────────────────────────────────────

export function buildStepsFC(n: number): Step[] {
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

// ─── Bitmask ──────────────────────────────────────────────────────────────────

function popcount(x: number): number {
    x -= (x >> 1) & 0x55555555;
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    return (x * 0x01010101) >>> 24;
}

export function buildStepsBM(n: number): Step[] {
    const steps: Step[] = [];
    const board = Array<number>(n).fill(-1);
    const full = (1 << n) - 1;

    function solve(row: number, cols: number, diag1: number, diag2: number): void {
        if (row === n) {
            steps.push({ type: "solution", board: [...board], row, col: -1, reason: `All ${n} queens placed — solution found!`, stackDepth: row });
            return;
        }
        const available = full & ~(cols | diag1 | diag2);
        const availCount = popcount(available);
        steps.push({ type: "enter", board: [...board], row, col: -1, reason: `Row ${row}: bitmask yields ${availCount} safe column${availCount !== 1 ? "s" : ""} — invalid positions pre-filtered`, stackDepth: row });

        if (available === 0) {
            steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row}: bitmask is 0 — prune this branch`, stackDepth: row });
            return;
        }

        let mask = available;
        while (mask) {
            const bit = mask & (-mask);
            const col = 31 - Math.clz32(bit);
            mask &= mask - 1;
            steps.push({ type: "check", board: [...board], row, col, reason: `Bitmask candidate: row ${row}, col ${col}`, stackDepth: row });
            board[row] = col;
            steps.push({ type: "place", board: [...board], row, col, reason: `Placed at (${row}, ${col}) — bitmask guarantees no conflict`, stackDepth: row });
            solve(row + 1, cols | bit, (diag1 | bit) << 1, (diag2 | bit) >> 1);
            board[row] = -1;
            steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking from (${row}, ${col})`, stackDepth: row });
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all ${availCount} bitmask candidate${availCount !== 1 ? "s" : ""} tried`, stackDepth: row });
    }

    solve(0, 0, 0, 0);
    return steps;
}

// ─── Fast step counter (no Step allocation — safe for large N / workers) ──────

export function countStepsTotal(method: MethodKey, n: number): number {
    let c = 0;
    if (method === "bt") {
        const board = Array<number>(n).fill(-1);
        const isSafe = (row: number, col: number) => {
            for (let r = 0; r < row; r++) {
                if (board[r] === col || Math.abs(board[r] - col) === Math.abs(r - row)) return false;
            }
            return true;
        };
        const solve = (row: number): void => {
            if (row === n) { c++; return; }
            c++;
            for (let col = 0; col < n; col++) {
                c++;
                if (isSafe(row, col)) { c++; board[row] = col; solve(row + 1); board[row] = -1; c++; }
                else c++;
            }
            c++;
        };
        solve(0);
    } else if (method === "fc") {
        const board = Array<number>(n).fill(-1);
        const solve = (row: number, domains: Set<number>[]): void => {
            if (row === n) { c++; return; }
            const vc = Array.from(domains[row]).sort((a, b) => a - b);
            c++;
            for (const col of vc) {
                c++;
                const nd = domains.map(s => new Set(s));
                let ok = true;
                for (let r = row + 1; r < n; r++) {
                    const d = r - row;
                    nd[r].delete(col); nd[r].delete(col - d); nd[r].delete(col + d);
                    if (nd[r].size === 0) { ok = false; break; }
                }
                if (ok) { c++; board[row] = col; solve(row + 1, nd); board[row] = -1; c++; }
                else c++;
            }
            c++;
        };
        solve(0, Array.from({ length: n }, () => new Set(Array.from({ length: n }, (_, i) => i))));
    } else {
        const full = (1 << n) - 1;
        const solve = (row: number, cols: number, d1: number, d2: number): void => {
            if (row === n) { c++; return; }
            const avail = full & ~(cols | d1 | d2);
            c++;
            if (avail === 0) { c++; return; }
            let mask = avail;
            while (mask) {
                const bit = mask & (-mask); mask &= mask - 1;
                c += 2;
                solve(row + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);
                c++;
            }
            c++;
        };
        solve(0, 0, 0, 0);
    }
    return c;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function buildMethodSteps(method: MethodKey, n: number): Step[] {
    if (method === "fc") return buildStepsFC(n);
    if (method === "bm") return buildStepsBM(n);
    return buildSteps(n);
}

export function getAllSolutions(n: number): number[][] {
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

export function getCellState(step: Step | undefined, row: number, col: number): CellState {
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

export function countStepStats(steps: Step[], upTo: number) {
    let checks = 0, placements = 0, conflicts = 0, backtracks = 0, depthSum = 0;
    for (let i = 0; i <= upTo; i++) {
        const { type, stackDepth } = steps[i];
        if (type === "check") checks++;
        if (type === "place") placements++;
        if (type === "conflict") conflicts++;
        if (type === "backtrack" || type === "exhaust") backtracks++;
        depthSum += stackDepth;
    }
    const avgDepth = upTo >= 0 ? depthSum / (upTo + 1) : 0;
    return { checks, placements, conflicts, backtracks, avgDepth };
}