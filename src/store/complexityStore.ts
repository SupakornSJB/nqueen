import { create } from 'zustand';
import type { MethodKey } from '../lib/types';
import type { WorkerPoint, WorkerMessage } from '../workers/complexity.worker';

export type { WorkerPoint };
export type ProgressInfo = { done: number; total: number; currentN: number };

interface ComplexityState {
    results:       Partial<Record<MethodKey, WorkerPoint[]>>;
    progress:      Partial<Record<MethodKey, ProgressInfo>>;
    // Start the worker for `method` using the provided N range.
    // No-ops if results are already cached or the worker is already running.
    startIfNeeded: (method: MethodKey, ns: number[]) => void;
}

// Workers are not serialisable — kept outside the store in a module-level map.
// This means workers survive Zustand resets but are cleaned up correctly.
const activeWorkers: Partial<Record<MethodKey, Worker>> = {};

export const useComplexityStore = create<ComplexityState>((set, get) => ({
    results:  {},
    progress: {},

    startIfNeeded: (method, ns) => {
        if (get().results[method] || activeWorkers[method]) return;

        const worker = new Worker(
            new URL('../workers/complexity.worker.ts', import.meta.url),
            { type: 'module' },
        );
        activeWorkers[method] = worker;

        worker.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
            if (e.data.type === 'progress') {
                set(s => ({ progress: { ...s.progress, [method]: e.data } }));
            } else {
                set(s => ({
                    results:  { ...s.results,  [method]: (e.data as { type: 'result'; data: WorkerPoint[] }).data },
                    progress: { ...s.progress, [method]: undefined },
                }));
                delete activeWorkers[method];
                worker.terminate();
            }
        });

        worker.postMessage({ method, ns });
    },
}));