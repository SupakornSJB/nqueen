import type { MethodKey } from "./types";

// ─── Backtracking ─────────────────────────────────────────────────────────────

export function solveBT(n: number): number[][] {
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
            if (isSafe(row, col)) {
                board[row] = col;
                solve(row + 1);
                board[row] = -1;
            }
        }
    }

    solve(0);
    return solutions;
}

// ─── Hash Set Backtracking ────────────────────────────────────────────────────

export function solveHT(n: number): number[][] {
    const solutions: number[][] = [];
    const board = Array<number>(n).fill(-1);
    const colSet = new Set<number>();
    const diagSet = new Set<number>();
    const antiDiagSet = new Set<number>();

    function solve(row: number): void {
        if (row === n) { solutions.push([...board]); return; }
        for (let col = 0; col < n; col++) {
            if (!colSet.has(col) && !diagSet.has(row - col) && !antiDiagSet.has(row + col)) {
                board[row] = col;
                colSet.add(col); diagSet.add(row - col); antiDiagSet.add(row + col);
                solve(row + 1);
                board[row] = -1;
                colSet.delete(col); diagSet.delete(row - col); antiDiagSet.delete(row + col);
            }
        }
    }

    solve(0);
    return solutions;
}

// ─── Forward Checking ─────────────────────────────────────────────────────────

export function solveFC(n: number): number[][] {
    const solutions: number[][] = [];
    const board = Array<number>(n).fill(-1);

    function solve(row: number, domains: Set<number>[]): void {
        if (row === n) { solutions.push([...board]); return; }
        for (const col of domains[row]) {
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
                solve(row + 1, newDomains);
                board[row] = -1;
            }
        }
    }

    const initialDomains = Array.from({ length: n }, () => new Set(Array.from({ length: n }, (_, i) => i)));
    solve(0, initialDomains);
    return solutions;
}

// ─── Bitmask ──────────────────────────────────────────────────────────────────

export function solveBM(n: number): number[][] {
    const solutions: number[][] = [];
    const board = Array<number>(n).fill(-1);
    const full = (1 << n) - 1;

    function solve(row: number, cols: number, diag1: number, diag2: number): void {
        if (row === n) { solutions.push([...board]); return; }
        let mask = full & ~(cols | diag1 | diag2);
        while (mask) {
            const bit = mask & (-mask);
            mask &= mask - 1;
            const col = 31 - Math.clz32(bit);
            board[row] = col;
            solve(row + 1, cols | bit, (diag1 | bit) << 1, (diag2 | bit) >> 1);
            board[row] = -1;
        }
    }

    solve(0, 0, 0, 0);
    return solutions;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export function solve(method: MethodKey, n: number): number[][] {
    if (method === "ht") return solveHT(n);
    if (method === "fc") return solveFC(n);
    if (method === "bm") return solveBM(n);
    return solveBT(n);
}