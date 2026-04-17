import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import type { CSSProperties } from "react";
import type { Step, MethodKey, SpeedKey } from "../../lib/types";
import { TYPE_META, METHOD_META, SPEED_MS } from "../../lib/constants";
import { buildMethodSteps, countStepStats } from "../../lib/algorithms";
import { Board } from "./Board";

// ─── Method Side Panel ────────────────────────────────────────────────────────

interface MethodSideProps { method: MethodKey; steps: Step[]; idx: number; n: number; }

export function MethodSide({ method, steps, idx, n }: MethodSideProps) {
    const meta = METHOD_META[method];
    // Clamp to avoid out-of-bounds during the render before a reset lands
    const safeIdx = Math.min(idx, Math.max(0, steps.length - 1));
    const step = steps[safeIdx] as Step | undefined;
    const stepMeta = step ? TYPE_META[step.type] : null;
    const stats = countStepStats(steps, safeIdx);
    const progress = steps.length > 1 ? (safeIdx / (steps.length - 1)) * 100 : 0;
    const done = safeIdx >= steps.length - 1;

    // Derived algorithm-specific metrics
    const efficiency   = stats.checks > 0 ? Math.round(stats.placements / stats.checks * 100) : 0;
    const conflictRate = stats.checks > 0 ? Math.round(stats.conflicts  / stats.checks * 100) : 0;
    const candPerRow   = n > 0 && safeIdx > 0
        ? (stats.checks / n).toFixed(1)
        : "—";

    return (
        <div style={{
            background: "var(--color-background-primary)",
            border: `1.5px solid ${meta.accentBorder}`,
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
        }}>
            {/* Header — dot inline with name text */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.accent, flexShrink: 0 }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: meta.accent }}>{meta.name}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{meta.desc}</div>
                </div>
                {done && (
                    <div style={{
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                        padding: "2px 8px", borderRadius: 99,
                        background: meta.accentBg, color: meta.accent,
                        border: `0.5px solid ${meta.accentBorder}`,
                    }}>
                        Done
                    </div>
                )}
            </div>

            {step && stepMeta && (
                <div style={{
                    padding: "5px 10px", fontSize: 11,
                    background: stepMeta.tagBg, border: `0.5px solid ${stepMeta.tagBorder}`,
                    borderRadius: "var(--border-radius-md)", color: stepMeta.tagText, fontWeight: 500,
                }}>
                    {step.reason}
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "center" }}>
                <Board step={step} n={n} />
            </div>

            <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                    <span>Step {safeIdx} / {steps.length - 1}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: 5, background: "var(--color-background-secondary)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: meta.accent, borderRadius: 99, transition: "width 0.1s" }} />
                </div>
            </div>

            {/* Core stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {([
                    { label: "Checks",     value: stats.checks,     color: "var(--color-text-primary)",  bg: "var(--color-background-secondary)", border: "var(--color-border-tertiary)" },
                    { label: "Placed",     value: stats.placements, color: "var(--color-text-success)", bg: "var(--color-background-success)",   border: "var(--color-border-success)" },
                    { label: "Conflicts",  value: stats.conflicts,  color: "var(--color-text-danger)",  bg: "var(--color-background-danger)",    border: "var(--color-border-danger)" },
                    { label: "Backtracks", value: stats.backtracks, color: "var(--color-text-warning)", bg: "var(--color-background-warning)",   border: "var(--color-border-warning)" },
                ] as const).map(({ label, value, color, bg, border }) => (
                    <div key={label} style={{
                        textAlign: "center", padding: "5px 2px",
                        background: bg, border: `0.5px solid ${border}`,
                        borderRadius: "var(--border-radius-md)",
                    }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color }}>{value}</div>
                        <div style={{ fontSize: 9, color, opacity: 0.65, marginTop: 1 }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* Derived algorithm-specific metrics */}
            <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
                borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 8,
            }}>
                <div style={{
                    textAlign: "center", padding: "5px 2px",
                    background: efficiency >= 80 ? "var(--color-background-success)" : "var(--color-background-secondary)",
                    border: `0.5px solid ${efficiency >= 80 ? "var(--color-border-success)" : "var(--color-border-tertiary)"}`,
                    borderRadius: "var(--border-radius-md)",
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: efficiency >= 80 ? "var(--color-text-success)" : "var(--color-text-primary)" }}>
                        {efficiency}%
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 1 }}>Check eff.</div>
                </div>
                <div style={{
                    textAlign: "center", padding: "5px 2px",
                    background: conflictRate === 0 ? "var(--color-background-success)" : "var(--color-background-secondary)",
                    border: `0.5px solid ${conflictRate === 0 ? "var(--color-border-success)" : "var(--color-border-tertiary)"}`,
                    borderRadius: "var(--border-radius-md)",
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: conflictRate === 0 ? "var(--color-text-success)" : "var(--color-text-danger)" }}>
                        {conflictRate}%
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 1 }}>Conflict rate</div>
                </div>
                <div style={{
                    textAlign: "center", padding: "5px 2px",
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)",
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {candPerRow}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 1 }}>Cands / row</div>
                </div>
                <div style={{
                    textAlign: "center", padding: "5px 2px",
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)",
                }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {stats.avgDepth.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--color-text-secondary)", marginTop: 1 }}>Avg depth</div>
                </div>
            </div>
        </div>
    );
}

// ─── Comparison Bar ───────────────────────────────────────────────────────────

interface ComparisonBarProps {
    stepsA: Step[]; stepsB: Step[];
    idxA: number; idxB: number;
    methodA: MethodKey; methodB: MethodKey;
    n: number;
}

export function ComparisonBar({ stepsA, stepsB, idxA, idxB, methodA, methodB, n }: ComparisonBarProps) {
    const totalA = stepsA.length - 1;
    const totalB = stepsB.length - 1;
    const maxTotal = Math.max(totalA, totalB);
    const metaA = METHOD_META[methodA];
    const metaB = METHOD_META[methodB];

    const safeIdxA = Math.min(idxA, Math.max(0, stepsA.length - 1));
    const safeIdxB = Math.min(idxB, Math.max(0, stepsB.length - 1));

    const aFinalStats = countStepStats(stepsA, totalA);
    const bFinalStats = countStepStats(stepsB, totalB);

    const p = (num: number, den: number) => den > 0 ? Math.round(num / den * 100) : 0;
    const aEff  = p(aFinalStats.placements, aFinalStats.checks);
    const bEff  = p(bFinalStats.placements, bFinalStats.checks);
    const aConf = p(aFinalStats.conflicts,  aFinalStats.checks);
    const bConf = p(bFinalStats.conflicts,  bFinalStats.checks);
    const aCpr  = n > 0 ? Math.round(aFinalStats.checks / n) : 0;
    const bCpr  = n > 0 ? Math.round(bFinalStats.checks / n) : 0;

    type MetricRow = { label: string; a: number | string; b: number | string; aWins: boolean; bWins: boolean };
    const metrics: MetricRow[] = [
        { label: "Total steps",      a: totalA,                          b: totalB,                          aWins: totalA < totalB,                              bWins: totalB < totalA },
        { label: "Checks",           a: aFinalStats.checks,              b: bFinalStats.checks,              aWins: aFinalStats.checks < bFinalStats.checks,      bWins: bFinalStats.checks < aFinalStats.checks },
        { label: "Conflicts",        a: aFinalStats.conflicts,           b: bFinalStats.conflicts,           aWins: aFinalStats.conflicts < bFinalStats.conflicts, bWins: bFinalStats.conflicts < aFinalStats.conflicts },
        { label: "Backtracks",       a: aFinalStats.backtracks,          b: bFinalStats.backtracks,          aWins: aFinalStats.backtracks < bFinalStats.backtracks, bWins: bFinalStats.backtracks < aFinalStats.backtracks },
        { label: "Check efficiency", a: `${aEff}%`,                      b: `${bEff}%`,                      aWins: aEff > bEff,                                  bWins: bEff > aEff },
        { label: "Conflict rate",    a: `${aConf}%`,                     b: `${bConf}%`,                     aWins: aConf < bConf,                                bWins: bConf < aConf },
        { label: "Cands / row",      a: aCpr,                            b: bCpr,                            aWins: aCpr < bCpr,                                  bWins: bCpr < aCpr },
        { label: "Avg depth",        a: aFinalStats.avgDepth.toFixed(2), b: bFinalStats.avgDepth.toFixed(2), aWins: aFinalStats.avgDepth < bFinalStats.avgDepth,  bWins: bFinalStats.avgDepth < aFinalStats.avgDepth },
    ];

    const winnerMeta = totalA <= totalB ? metaA : metaB;
    const loserMeta  = totalA <= totalB ? metaB : metaA;
    const savingPct  = Math.abs(Math.round((1 - Math.min(totalA, totalB) / Math.max(totalA, totalB)) * 100));

    return (
        <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
        }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 10 }}>
                Efficiency comparison
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {[
                    { meta: metaA, total: totalA, cur: safeIdxA },
                    { meta: metaB, total: totalB, cur: safeIdxB },
                ].map(({ meta, total, cur }) => {
                    const frac    = total / maxTotal * 100;
                    const curFrac = total > 0 ? (cur / total) * frac : 0;
                    return (
                        <div key={meta.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                                <span style={{ color: meta.accent, fontWeight: 600 }}>{meta.name}</span>
                                <span style={{ color: "var(--color-text-secondary)" }}>{total} steps total</span>
                            </div>
                            <div style={{ height: 10, background: "var(--color-background-secondary)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                                <div style={{ position: "absolute", height: "100%", width: `${frac}%`, background: meta.accentBg, borderRadius: 99 }} />
                                <div style={{ position: "absolute", height: "100%", width: `${curFrac}%`, background: meta.accent, borderRadius: 99, opacity: 0.85, transition: "width 0.1s" }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr repeat(2, 80px)", gap: "4px 8px", alignItems: "center" }}>
                <div />
                <div style={{ fontSize: 10, fontWeight: 700, color: metaA.accent, textAlign: "right" }}>{metaA.name.split(" ")[0]}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: metaB.accent, textAlign: "right" }}>{metaB.name.split(" ")[0]}</div>
                {metrics.map(({ label, a, b, aWins, bWins }) => {
                    const numDiff = typeof a === "number" && typeof b === "number" ? Math.abs(a - b) : null;
                    return (
                        <Fragment key={label}>
                            <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: aWins ? "var(--color-text-success)" : "var(--color-text-primary)", textAlign: "right" }}>
                                {a}{aWins && numDiff !== null && <span style={{ fontSize: 9, marginLeft: 3, color: "var(--color-text-success)" }}>−{numDiff}</span>}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: bWins ? "var(--color-text-success)" : "var(--color-text-primary)", textAlign: "right" }}>
                                {b}{bWins && numDiff !== null && <span style={{ fontSize: 9, marginLeft: 3, color: "var(--color-text-success)" }}>−{numDiff}</span>}
                            </div>
                        </Fragment>
                    );
                })}
            </div>

            <div style={{
                marginTop: 10, padding: "6px 10px",
                background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)",
                borderRadius: "var(--border-radius-md)", fontSize: 12, color: "var(--color-text-success)", fontWeight: 500,
            }}>
                {winnerMeta.name} uses {savingPct}% fewer steps than {loserMeta.name} for N = {n}
            </div>
        </div>
    );
}

// ─── Compare View ─────────────────────────────────────────────────────────────

export function CompareView({ n, speed }: { n: number; speed: SpeedKey }) {
    const [methodA, setMethodA] = useState<MethodKey>("bt");
    const [methodB, setMethodB] = useState<MethodKey>("fc");

    const stepsA = useMemo(() => buildMethodSteps(methodA, n), [methodA, n]);
    const stepsB = useMemo(() => buildMethodSteps(methodB, n), [methodB, n]);
    const [idxA, setIdxA] = useState(0);
    const [idxB, setIdxB] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [prevParams, setPrevParams] = useState({ n, methodA, methodB });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Inline derived-state reset — prevents out-of-bounds on the render that follows a param change
    if (prevParams.n !== n || prevParams.methodA !== methodA || prevParams.methodB !== methodB) {
        setPrevParams({ n, methodA, methodB });
        setIdxA(0);
        setIdxB(0);
        setPlaying(false);
    }

    const doneA = idxA >= stepsA.length - 1;
    const doneB = idxB >= stepsB.length - 1;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { if (doneA && doneB) setPlaying(false); }, [doneA, doneB]);

    useEffect(() => {
        if (playing) {
            intervalRef.current = setInterval(() => {
                setIdxA(i => Math.min(i + 1, stepsA.length - 1));
                setIdxB(i => Math.min(i + 1, stepsB.length - 1));
            }, SPEED_MS[speed]);
        } else {
            if (intervalRef.current !== null) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
    }, [playing, speed, stepsA.length, stepsB.length]);

    const reset = () => { setIdxA(0); setIdxB(0); setPlaying(false); };
    const togglePlay = () => {
        if (doneA && doneB) { reset(); setPlaying(true); return; }
        setPlaying(p => !p);
    };
    const stepBoth = () => {
        setIdxA(i => Math.min(i + 1, stepsA.length - 1));
        setIdxB(i => Math.min(i + 1, stepsB.length - 1));
    };
    const backBoth = () => {
        setIdxA(i => Math.max(i - 1, 0));
        setIdxB(i => Math.max(i - 1, 0));
    };

    const selectA = (m: MethodKey) => { if (m === methodB) setMethodB(methodA); setMethodA(m); };
    const selectB = (m: MethodKey) => { if (m === methodA) setMethodA(methodB); setMethodB(m); };

    const btnBase: CSSProperties = {
        padding: "6px 12px", fontSize: 12, cursor: "pointer",
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "transparent", color: "var(--color-text-primary)",
    };

    const methodBtn = (m: MethodKey, active: boolean, onClick: () => void) => {
        const meta = METHOD_META[m];
        return (
            <button key={m} onClick={onClick} style={{
                padding: "3px 10px", fontSize: 11, cursor: "pointer",
                borderRadius: "var(--border-radius-md)",
                border: active ? `1.5px solid ${meta.accentBorder}` : "0.5px solid var(--color-border-secondary)",
                background: active ? meta.accentBg : "transparent",
                color: active ? meta.accent : "var(--color-text-secondary)",
                fontWeight: active ? 700 : 400, transition: "all 0.1s",
            }}>
                {meta.name}
            </button>
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "10px 14px",
                display: "flex", flexDirection: "column", gap: 8,
            }}>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 28 }}>Left</span>
                        {(["bt", "fc", "bm"] as MethodKey[]).map(m => methodBtn(m, methodA === m, () => selectA(m)))}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>vs</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 34 }}>Right</span>
                        {(["bt", "fc", "bm"] as MethodKey[]).map(m => methodBtn(m, methodB === m, () => selectB(m)))}
                    </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={togglePlay} style={{
                        ...btnBase,
                        border: "0.5px solid var(--color-border-info)",
                        background: "var(--color-background-info)",
                        color: "var(--color-text-info)", fontWeight: 600,
                        padding: "6px 16px", fontSize: 13,
                    }}>
                        {playing ? "⏸ Pause" : (doneA && doneB) ? "↺ Replay race" : "▶ Start race"}
                    </button>
                    <button onClick={backBoth} disabled={idxA === 0 && idxB === 0} style={btnBase}>◀ Back</button>
                    <button onClick={stepBoth} disabled={doneA && doneB} style={btnBase}>Step ▶</button>
                    <button onClick={reset} style={btnBase}>↺ Reset</button>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                        Both algorithms advance at the same step — the faster one finishes first
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                <MethodSide method={methodA} steps={stepsA} idx={idxA} n={n} />
                <MethodSide method={methodB} steps={stepsB} idx={idxB} n={n} />
            </div>

            <ComparisonBar
                stepsA={stepsA} stepsB={stepsB}
                idxA={idxA} idxB={idxB}
                methodA={methodA} methodB={methodB}
                n={n}
            />
        </div>
    );
}