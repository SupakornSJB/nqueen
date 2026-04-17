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
        steps.push({ type: "enter", board: [...board], row, col: -1, reason: `Entering row ${row} — will scan each col with isSafe() loop (O(${row}) per check)`, stackDepth: row });
        for (let col = 0; col < n; col++) {
            steps.push({ type: "check", board: [...board], row, col, reason: `isSafe scan: checking col ${col} against ${row} placed queen${row !== 1 ? "s" : ""} for column & diagonal conflicts`, stackDepth: row });
            if (isSafe(board, row, col)) {
                board[row] = col;
                steps.push({ type: "place", board: [...board], row, col, reason: `Placed at (${row}, ${col}) — isSafe scan passed: no column or diagonal match in rows 0–${row - 1}`, stackDepth: row });
                solve(row + 1);
                board[row] = -1;
                if (row < n - 1 || col < n - 1) {
                    steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking from (${row}, ${col}) — no solution found down this path`, stackDepth: row });
                }
            } else {
                const reasons: string[] = [];
                for (let r = 0; r < row; r++) {
                    if (board[r] === col) reasons.push(`col ${col} blocked by queen at (${r}, ${board[r]})`);
                    else if (Math.abs(board[r] - col) === Math.abs(r - row)) reasons.push(`diagonal conflict with queen at (${r}, ${board[r]})`);
                }
                steps.push({ type: "conflict", board: [...board], row, col, reason: `isSafe failed at (${row}, ${col}): ${reasons[0] ?? "blocked"}`, stackDepth: row });
            }
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all ${n} columns tried by isSafe scan`, stackDepth: row });
    }

    solve(0);
    return steps;
}

// ─── Hash Set Backtracking ────────────────────────────────────────────────────

export function buildStepsHT(n: number): Step[] {
    const steps: Step[] = [];
    const board = Array<number>(n).fill(-1);
    const colSet = new Set<number>();
    const diagSet = new Set<number>();     // row - col
    const antiDiagSet = new Set<number>(); // row + col

    function solve(row: number): void {
        if (row === n) {
            steps.push({ type: "solution", board: [...board], row, col: -1, reason: `All ${n} queens placed — solution found!`, stackDepth: row });
            return;
        }
        const fmtSet = (s: Set<number>) => s.size === 0 ? "∅" : `{${[...s].sort((a, b) => a - b).join(",")}}`;
        steps.push({ type: "enter", board: [...board], row, col: -1,
            reason: `Entering row ${row} — colSet=${fmtSet(colSet)}, diagSet=${fmtSet(diagSet)}, antiSet=${fmtSet(antiDiagSet)}`,
            stackDepth: row });
        for (let col = 0; col < n; col++) {
            const cBlocked = colSet.has(col);
            const dBlocked = diagSet.has(row - col);
            const aBlocked = antiDiagSet.has(row + col);
            steps.push({ type: "check", board: [...board], row, col,
                reason: `(${row},${col}): col=${col}→${cBlocked ? "HIT ✗" : "miss ✓"} · diag=${row - col}→${dBlocked ? "HIT ✗" : "miss ✓"} · anti=${row + col}→${aBlocked ? "HIT ✗" : "miss ✓"}`,
                stackDepth: row });
            if (!cBlocked && !dBlocked && !aBlocked) {
                board[row] = col;
                colSet.add(col); diagSet.add(row - col); antiDiagSet.add(row + col);
                steps.push({ type: "place", board: [...board], row, col,
                    reason: `Placed at (${row},${col}) — sets updated: colSet=${fmtSet(colSet)}, diagSet=${fmtSet(diagSet)}, antiSet=${fmtSet(antiDiagSet)}`,
                    stackDepth: row });
                solve(row + 1);
                board[row] = -1;
                colSet.delete(col); diagSet.delete(row - col); antiDiagSet.delete(row + col);
                if (row < n - 1 || col < n - 1) {
                    steps.push({ type: "backtrack", board: [...board], row, col,
                        reason: `Backtracking from (${row},${col}) — sets restored: colSet=${fmtSet(colSet)}, diagSet=${fmtSet(diagSet)}, antiSet=${fmtSet(antiDiagSet)}`,
                        stackDepth: row });
                }
            } else {
                const reason = cBlocked
                    ? `col=${col} in colSet=${fmtSet(colSet)} (column occupied)`
                    : dBlocked
                        ? `diag=${row - col} in diagSet=${fmtSet(diagSet)} (↘ diagonal attacked)`
                        : `anti=${row + col} in antiSet=${fmtSet(antiDiagSet)} (↗ anti-diagonal attacked)`;
                steps.push({ type: "conflict", board: [...board], row, col, reason: `Blocked at (${row},${col}): ${reason}`, stackDepth: row });
            }
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all ${n} columns tried via set lookups`, stackDepth: row });
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
        steps.push({ type: "enter", board: [...board], row, col: -1, reason: `Entering row ${row} — domain: {${validCols.join(", ")}} (${validCols.length} candidate${validCols.length !== 1 ? "s" : ""} after prior propagation)`, stackDepth: row });

        for (const col of validCols) {
            steps.push({ type: "check", board: [...board], row, col, reason: `Testing (${row}, ${col}): propagating constraints to ${n - row - 1} future row${n - row - 1 !== 1 ? "s" : ""} (rows ${row + 1}–${n - 1})`, stackDepth: row });
            const newDomains = domains.map(s => new Set(s));
            let feasible = true;
            let emptyRow = -1;
            for (let r = row + 1; r < n; r++) {
                const diff = r - row;
                newDomains[r].delete(col);
                newDomains[r].delete(col - diff);
                newDomains[r].delete(col + diff);
                if (newDomains[r].size === 0) { feasible = false; emptyRow = r; break; }
            }
            if (feasible) {
                board[row] = col;
                steps.push({ type: "place", board: [...board], row, col, reason: `Placed at (${row}, ${col}) — all ${n - row - 1} future rows have non-empty domains after propagation`, stackDepth: row });
                solve(row + 1, newDomains);
                board[row] = -1;
                steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking from (${row}, ${col}) — restoring domains to pre-propagation state`, stackDepth: row });
            } else {
                steps.push({ type: "prune", board: [...board], row, col, reason: `Pruned (${row}, ${col}) — propagation emptied row ${emptyRow}'s domain (no column can be placed there)`, stackDepth: row });
            }
        }
        steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row} exhausted — all ${validCols.length} domain candidate${validCols.length !== 1 ? "s" : ""} tried`, stackDepth: row });
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
        const pad = (v: number) => v.toString(2).padStart(n, "0");
        steps.push({ type: "enter", board: [...board], row, col: -1,
            reason: `Row ${row}: cols=${pad(cols)} | d↘=${pad(diag1)} | d↗=${pad(diag2)} → avail=${pad(available)} (${availCount} safe col${availCount !== 1 ? "s" : ""})`,
            stackDepth: row });

        if (available === 0) {
            steps.push({ type: "exhaust", board: [...board], row, col: -1, reason: `Row ${row}: available mask = 0 — all columns blocked, prune branch`, stackDepth: row });
            return;
        }

        let mask = available;
        while (mask) {
            const bit = mask & (-mask);
            const col = 31 - Math.clz32(bit);
            mask &= mask - 1;
            steps.push({ type: "check", board: [...board], row, col, reason: `Bitmask candidate (${row},${col}): bit=${pad(bit)} extracted from avail=${pad(available)} — safe by construction`, stackDepth: row });
            board[row] = col;
            const nCols = (cols | bit) & full;
            const nD1   = ((diag1 | bit) << 1) & full;
            const nD2   = ((diag2 | bit) >> 1) & full;
            steps.push({ type: "place", board: [...board], row, col, reason: `Placed at (${row},${col}) — row ${row + 1} state: cols=${pad(nCols)}, d↘=${pad(nD1)}, d↗=${pad(nD2)}`, stackDepth: row });
            solve(row + 1, cols | bit, (diag1 | bit) << 1, (diag2 | bit) >> 1);
            board[row] = -1;
            steps.push({ type: "backtrack", board: [...board], row, col, reason: `Backtracking from (${row}, ${col}) — restoring bitmask state for next candidate`, stackDepth: row });
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
    } else if (method === "ht") {
        // Integer-bitmask backing: O(1) bit ops, no Set object allocation
        let colMask = 0, diagMask = 0, antiMask = 0;
        const solve = (row: number): void => {
            if (row === n) { c++; return; }
            c++;
            for (let col = 0; col < n; col++) {
                c++;
                const dIdx = row - col + n - 1;
                const aIdx = row + col;
                if (!((colMask >> col) & 1) && !((diagMask >> dIdx) & 1) && !((antiMask >> aIdx) & 1)) {
                    c++;
                    colMask |= 1 << col; diagMask |= 1 << dIdx; antiMask |= 1 << aIdx;
                    solve(row + 1);
                    colMask &= ~(1 << col); diagMask &= ~(1 << dIdx); antiMask &= ~(1 << aIdx);
                    c++;
                } else c++;
            }
            c++;
        };
        solve(0);
    } else if (method === "fc") {
        // Integer bitmask domains + undo stack: no Set allocation, no O(N²) copy per node
        const full = (1 << n) - 1;
        const domains = Array<number>(n).fill(full);
        const undoR = new Int32Array(n * n);
        const undoV = new Int32Array(n * n);
        let undoTop = 0;
        const solve = (row: number): void => {
            if (row === n) { c++; return; }
            c++;
            let mask = domains[row];
            while (mask) {
                const bit = mask & (-mask); mask &= mask - 1;
                const col = 31 - Math.clz32(bit);
                c++;
                const savedTop = undoTop;
                let ok = true;
                for (let r = row + 1; r < n; r++) {
                    const d = r - row;
                    const prev = domains[r];
                    let next = prev & ~(1 << col);
                    if (col - d >= 0) next &= ~(1 << (col - d));
                    if (col + d < n)  next &= ~(1 << (col + d));
                    if (next !== prev) { undoR[undoTop] = r; undoV[undoTop++] = prev; domains[r] = next; }
                    if (next === 0) { ok = false; break; }
                }
                if (ok) { c++; solve(row + 1); c++; }
                else c++;
                while (undoTop > savedTop) domains[undoR[--undoTop]] = undoV[undoTop];
            }
            c++;
        };
        solve(0);
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
    if (method === "ht") return buildStepsHT(n);
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
        if (type === "conflict" || type === "prune") conflicts++;
        if (type === "backtrack" || type === "exhaust") backtracks++;
        depthSum += stackDepth;
    }
    const avgDepth = upTo >= 0 ? depthSum / (upTo + 1) : 0;
    return { checks, placements, conflicts, backtracks, avgDepth };
}