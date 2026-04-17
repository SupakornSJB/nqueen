import type { MethodKey } from '../lib/types';
import { countStepsTotal } from '../lib/algorithms';

export interface WorkerPoint {
    n: number;
    steps: number;
    times: number[]; // µs per single run, length = runsForN(n)
}

export type WorkerMessage =
    | { type: 'progress'; done: number; total: number; currentN: number }
    | { type: 'result'; data: WorkerPoint[] };

// Batch: how many countStepsTotal calls per timing sample (amortises timer resolution for fast N).
const BATCH: Record<number, number> = {
    4: 600, 5: 250, 6: 100, 7: 40, 8: 15, 9: 6, 10: 3, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
};

// Fewer scatter points for large N (each run is slower).
function runsForN(n: number): number {
    if (n <= 7)  return 12;
    if (n <= 9)  return 10;
    if (n <= 11) return 6;
    return 4;
}

function post(msg: WorkerMessage) {
    (self as unknown as { postMessage: (d: unknown) => void }).postMessage(msg);
}

addEventListener('message', (e: MessageEvent<{ method: MethodKey; ns: number[] }>) => {
    const { method, ns } = e.data;
    const results: WorkerPoint[] = [];

    for (let i = 0; i < ns.length; i++) {
        const n   = ns[i];
        const batch = BATCH[n] ?? 1;
        const runs  = runsForN(n);

        // JIT warmup — prevents first-run overhead from skewing samples
        for (let k = 0; k < 5; k++) countStepsTotal(method, n);

        const steps  = countStepsTotal(method, n);
        const times: number[] = [];

        for (let r = 0; r < runs; r++) {
            const t0 = performance.now();
            for (let k = 0; k < batch; k++) countStepsTotal(method, n);
            times.push((performance.now() - t0) * 1000 / batch); // µs per run
        }

        results.push({ n, steps, times });
        // Stream progress after each N so the UI can update the progress bar
        post({ type: 'progress', done: i + 1, total: ns.length, currentN: n });
    }

    post({ type: 'result', data: results });
});