import { create } from 'zustand';
import type { MethodKey } from '../lib/types';
import type { WorkerPoint, WorkerMessage } from '../workers/complexity.worker';

export type { WorkerPoint };
export type ProgressInfo = { done: number; total: number; currentN: number; error?: string };

// ── Per-N localStorage helpers ─────────────────────────────────────────────────

const NORMAL_POINTS_KEY = 'nqueens_normal_points_v1';
const EXT_POINTS_KEY    = 'nqueens_ext_points_v2';

type PointCache = Partial<Record<MethodKey, Record<number, WorkerPoint>>>;

function loadCache(key: string): PointCache {
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : {}; }
    catch { return {}; }
}

function savePoint(key: string, method: MethodKey, point: WorkerPoint) {
    try {
        const c = loadCache(key);
        c[method] = { ...(c[method] ?? {}), [point.n]: point };
        localStorage.setItem(key, JSON.stringify(c));
    } catch {}
}

function clearCache(key: string) {
    try { localStorage.removeItem(key); } catch {}
}

// ── Store interface ────────────────────────────────────────────────────────────

interface ComplexityState {
    results:               Partial<Record<MethodKey, WorkerPoint[]>>;
    progress:              Partial<Record<MethodKey, ProgressInfo>>;
    resultsExtended:       Partial<Record<MethodKey, WorkerPoint[]>>;
    progressExtended:      Partial<Record<MethodKey, ProgressInfo>>;
    startIfNeeded:         (method: MethodKey, ns: number[]) => void;
    startExtendedIfNeeded: (method: MethodKey, fullNs: number[]) => void;
    stopAllWorkers:        () => void;
    clearNormalCache:      () => void;
    clearExtCache:         () => void;
}

const activeWorkers:         Partial<Record<MethodKey, Worker>> = {};
const activeExtendedWorkers: Partial<Record<MethodKey, Worker>> = {};

// Terminate all workers on tab/page close (not on SPA navigation).
window.addEventListener('beforeunload', () => {
    Object.values(activeWorkers).forEach(w => w?.terminate());
    Object.values(activeExtendedWorkers).forEach(w => w?.terminate());
});

// ── Worker factory ─────────────────────────────────────────────────────────────

function spawnWorker(
    method: MethodKey,
    ns: number[],
    cacheKey: string,
    onProgress: (info: ProgressInfo) => void,
    onDone: (allCached: Record<number, WorkerPoint>) => void,
): Worker {
    console.log(`[complexity] spawning worker method=${method} ns=${ns[0]}..${ns[ns.length - 1]} (${ns.length} values)`);
    const worker = new Worker(
        new URL('../workers/complexity.worker.ts', import.meta.url),
        { type: 'module' },
    );
    worker.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
        const msg = e.data;
        if (msg.type === 'progress') {
            onProgress({ done: msg.done, total: msg.total, currentN: msg.currentN });
        } else if (msg.type === 'point') {
            savePoint(cacheKey, method, msg.data);
        } else {
            onDone(loadCache(cacheKey)[method] ?? {});
            worker.terminate();
        }
    });
    worker.addEventListener('error', (e) => {
        console.error(`[complexity] worker error method=${method}:`, e.message, e);
        onProgress({ done: 0, total: ns.length, currentN: ns[0], error: e.message ?? 'Worker failed' });
    });
    worker.postMessage({ method, ns });
    return worker;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useComplexityStore = create<ComplexityState>((set, get) => ({
    results:          {},
    progress:         {},
    resultsExtended:  {},
    progressExtended: {},

    startIfNeeded: (method, fullNs) => {
        if (get().results[method] || activeWorkers[method]) return;

        const cached    = loadCache(NORMAL_POINTS_KEY)[method] ?? {};
        const missingNs = fullNs.filter(n => !cached[n]);

        if (missingNs.length === 0) {
            const pts = fullNs.map(n => cached[n]!).sort((a, b) => a.n - b.n);
            set(s => ({ results: { ...s.results, [method]: pts } }));
            return;
        }

        // Show loading pill immediately — before the first progress message arrives.
        set(s => ({ progress: { ...s.progress, [method]: { done: 0, total: missingNs.length, currentN: missingNs[0] } } }));

        activeWorkers[method] = spawnWorker(
            method, missingNs, NORMAL_POINTS_KEY,
            info => set(s => ({ progress: { ...s.progress, [method]: info } })),
            allCached => {
                if (fullNs.every(n => allCached[n])) {
                    const pts = fullNs.map(n => allCached[n]!).sort((a, b) => a.n - b.n);
                    set(s => ({
                        results:  { ...s.results,  [method]: pts },
                        progress: { ...s.progress, [method]: undefined },
                    }));
                }
                delete activeWorkers[method];
            },
        );
    },

    startExtendedIfNeeded: (method, fullNs) => {
        if (activeExtendedWorkers[method]) return;
        if (get().resultsExtended[method]) return;

        const cached    = loadCache(EXT_POINTS_KEY)[method] ?? {};
        const missingNs = fullNs.filter(n => !cached[n]);

        if (missingNs.length === 0) {
            const pts = fullNs.map(n => cached[n]!).sort((a, b) => a.n - b.n);
            set(s => ({ resultsExtended: { ...s.resultsExtended, [method]: pts } }));
            return;
        }

        // Show loading pill immediately — before the first progress message arrives.
        set(s => ({ progressExtended: { ...s.progressExtended, [method]: { done: 0, total: missingNs.length, currentN: missingNs[0] } } }));

        activeExtendedWorkers[method] = spawnWorker(
            method, missingNs, EXT_POINTS_KEY,
            info => set(s => ({ progressExtended: { ...s.progressExtended, [method]: info } })),
            allCached => {
                if (fullNs.every(n => allCached[n])) {
                    const pts = fullNs.map(n => allCached[n]!).sort((a, b) => a.n - b.n);
                    set(s => ({
                        resultsExtended:  { ...s.resultsExtended,  [method]: pts },
                        progressExtended: { ...s.progressExtended, [method]: undefined },
                    }));
                }
                delete activeExtendedWorkers[method];
            },
        );
    },

    stopAllWorkers: () => {
        (Object.keys(activeWorkers) as MethodKey[]).forEach(m => {
            activeWorkers[m]?.terminate();
            delete activeWorkers[m];
        });
        (Object.keys(activeExtendedWorkers) as MethodKey[]).forEach(m => {
            activeExtendedWorkers[m]?.terminate();
            delete activeExtendedWorkers[m];
        });
        set({ progress: {}, progressExtended: {} });
    },

    clearNormalCache: () => {
        (Object.keys(activeWorkers) as MethodKey[]).forEach(m => {
            activeWorkers[m]?.terminate();
            delete activeWorkers[m];
        });
        clearCache(NORMAL_POINTS_KEY);
        set({ results: {}, progress: {} });
    },

    clearExtCache: () => {
        (Object.keys(activeExtendedWorkers) as MethodKey[]).forEach(m => {
            activeExtendedWorkers[m]?.terminate();
            delete activeExtendedWorkers[m];
        });
        clearCache(EXT_POINTS_KEY);
        clearCache('nqueens_ext_complexity_v1');
        set({ resultsExtended: {}, progressExtended: {} });
    },
}));