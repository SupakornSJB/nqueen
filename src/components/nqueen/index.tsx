import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode, CSSProperties } from "react";
import type { MethodKey, SpeedKey, TabKey, Step } from "../../lib/types";
import { TYPE_META, CELL, METHOD_META, SPEED_MS } from "../../lib/constants";
import { buildMethodSteps, getAllSolutions } from "../../lib/algorithms";
import { Board } from "./Board";
import { SolutionsGallery } from "./SolutionsGallery";
import { CallStack, DecisionLog, DecisionTree } from "./DecisionPanels";
import { StatsBar } from "./StatsBar";
import { CompareView } from "./CompareView";
import { ChartsView } from "./Charts";
import { AboutView } from "./About";
import { FaqView } from "./FAQ";

type AppMode = "single" | "compare" | "charts" | "about" | "faq";

const MODES: { key: AppMode; label: string }[] = [
    { key: "single",  label: "Single" },
    { key: "compare", label: "Compare" },
    { key: "charts",  label: "Charts" },
    { key: "about",   label: "About" },
    { key: "faq",     label: "FAQ" },
];

export default function NQueensVisualizer() {
    const [n, setN] = useState<number>(6);
    const [currentIdx, setCurrentIdx] = useState<number>(0);
    const [playing, setPlaying] = useState<boolean>(false);
    const [speed, setSpeed] = useState<SpeedKey>("medium");
    const [activeTab, setActiveTab] = useState<TabKey>("log");
    const [showGallery, setShowGallery] = useState<boolean>(false);
    const [mode, setMode] = useState<AppMode>("single");
    const [method, setMethod] = useState<MethodKey>("bt");
    const [prevNMethod, setPrevNMethod] = useState({ n, method });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const steps = useMemo(() => buildMethodSteps(method, n), [method, n]);
    const allSolutions = useMemo(() => getAllSolutions(n), [n]);

    // Inline derived-state reset (React-approved getDerivedStateFromProps equivalent)
    if (prevNMethod.n !== n || prevNMethod.method !== method) {
        setPrevNMethod({ n, method });
        setCurrentIdx(0);
        setPlaying(false);
        setShowGallery(false);
    }

    const step = steps[currentIdx] as Step | undefined;
    const solvedSoFar = steps.slice(0, currentIdx + 1).filter(s => s.type === "solution").length;

    const jumpToSolution = useCallback((board: number[]) => {
        const idx = steps.findIndex(s => s.type === "solution" && s.board.every((v, i) => v === board[i]));
        if (idx !== -1) { setCurrentIdx(idx); setPlaying(false); }
    }, [steps]);

    const advance = useCallback(() => {
        setCurrentIdx(i => {
            if (i >= steps.length - 1) { setPlaying(false); return i; }
            return i + 1;
        });
    }, [steps.length]);

    useEffect(() => {
        if (playing) {
            intervalRef.current = setInterval(advance, SPEED_MS[speed]);
        } else {
            if (intervalRef.current !== null) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current !== null) clearInterval(intervalRef.current); };
    }, [playing, speed, advance]);

    const reset = () => { setCurrentIdx(0); setPlaying(false); };
    const togglePlay = () => {
        if (currentIdx >= steps.length - 1) { setCurrentIdx(0); setPlaying(true); return; }
        setPlaying(p => !p);
    };

    const progress = steps.length > 1 ? (currentIdx / (steps.length - 1)) * 100 : 0;

    const card = (children: ReactNode, style: CSSProperties = {}) => (
        <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 14px",
            ...style,
        }}>
            {children}
        </div>
    );

    const sectionLabel = (text: string) => (
        <div style={{ fontSize: 10, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
            {text}
        </div>
    );

    const tabs: TabKey[] = ["log", "stack", "tree"];
    const tabLabels: Record<TabKey, string> = { log: "Decision log", stack: "Call stack", tree: "Tree view" };

    const btnBase: CSSProperties = {
        padding: "6px 12px", fontSize: 12,
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-secondary)",
        background: "transparent", cursor: "pointer",
        color: "var(--color-text-primary)",
    };

    const hideControls = mode === "charts" || mode === "about" || mode === "faq";

    return (
        <div style={{ fontFamily: "var(--font-sans)", padding: "0.5rem 0", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* ── Mode selector — segmented control, visually distinct from other controls ── */}
            <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10,
            }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                    View
                </span>
                <div style={{
                    display: "inline-flex",
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-tertiary)",
                    borderRadius: "var(--border-radius-md)",
                    padding: 3,
                    gap: 2,
                    flexWrap: "wrap",
                }}>
                    {MODES.map(({ key, label }) => (
                        <button key={key} onClick={() => setMode(key)} style={{
                            padding: "5px 16px", fontSize: 13,
                            borderRadius: "calc(var(--border-radius-md) - 2px)",
                            border: "none",
                            background: mode === key ? "var(--color-background-primary)" : "transparent",
                            color: mode === key ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                            cursor: "pointer", fontWeight: mode === key ? 600 : 400,
                            boxShadow: mode === key ? "0 1px 4px rgba(0,0,0,0.14)" : "none",
                            transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                        }}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Playback controls — single and compare modes only ──────────── */}
            {!hideControls && card(
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>N =</span>
                                {([4, 5, 6, 7, 8] as number[]).map(v => (
                                    <button key={v} onClick={() => setN(v)} style={{
                                        padding: "3px 10px", fontSize: 13,
                                        borderRadius: "var(--border-radius-md)",
                                        border: n === v ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                                        background: n === v ? "var(--color-background-info)" : "transparent",
                                        color: n === v ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                        cursor: "pointer", fontWeight: n === v ? 700 : 400,
                                        boxShadow: n === v ? "0 0 0 2px var(--color-border-info)" : "none",
                                        transform: n === v ? "scale(1.08)" : "scale(1)",
                                        transition: "all 0.1s",
                                    }}>
                                        {v}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Speed</span>
                                {(Object.keys(SPEED_MS) as SpeedKey[]).map(s => (
                                    <button key={s} onClick={() => setSpeed(s)} style={{
                                        padding: "3px 8px", fontSize: 11,
                                        borderRadius: "var(--border-radius-md)",
                                        border: speed === s ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                                        background: speed === s ? "var(--color-background-info)" : "transparent",
                                        color: speed === s ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                        cursor: "pointer", fontWeight: speed === s ? 700 : 400,
                                        boxShadow: speed === s ? "0 0 0 2px var(--color-border-info)" : "none",
                                        transform: speed === s ? "scale(1.08)" : "scale(1)",
                                        transition: "all 0.1s",
                                    }}>
                                        {s === "vfast" ? "max" : s}
                                    </button>
                                ))}
                            </div>
                    </div>

                    {mode === "single" && <>
                        {/* Algorithm selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Algorithm</span>
                            {(["bt", "fc", "bm"] as MethodKey[]).map(m => {
                                const meta = METHOD_META[m];
                                const isActive = method === m;
                                return (
                                    <button key={m} onClick={() => setMethod(m)} style={{
                                        padding: "3px 10px", fontSize: 11,
                                        borderRadius: "var(--border-radius-md)",
                                        border: isActive ? `1.5px solid ${meta.accentBorder}` : "0.5px solid var(--color-border-secondary)",
                                        background: isActive ? meta.accentBg : "transparent",
                                        color: isActive ? meta.accent : "var(--color-text-secondary)",
                                        cursor: "pointer", fontWeight: isActive ? 700 : 400,
                                        boxShadow: isActive ? `0 0 0 2px ${meta.accentBorder}` : "none",
                                        transform: isActive ? "scale(1.08)" : "scale(1)",
                                        transition: "all 0.1s",
                                    }}>
                                        {meta.name}
                                    </button>
                                );
                            })}
                        </div>

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={togglePlay} style={{
                                ...btnBase,
                                border: "0.5px solid var(--color-border-info)",
                                background: "var(--color-background-info)",
                                color: "var(--color-text-info)", fontWeight: 500,
                                padding: "6px 16px", fontSize: 13,
                            }}>
                                {playing ? "⏸ Pause" : currentIdx >= steps.length - 1 ? "↺ Replay" : "▶ Play"}
                            </button>
                            <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0} style={btnBase}>◀ Back</button>
                            <button onClick={advance} disabled={currentIdx >= steps.length - 1} style={btnBase}>Step ▶</button>
                            <button onClick={reset} style={btnBase}>↺ Reset</button>
                        </div>

                        <div>
                            <input
                                type="range" min={0} max={steps.length - 1} value={currentIdx} step={1}
                                onChange={e => { setCurrentIdx(Number(e.target.value)); setPlaying(false); }}
                                style={{ width: "100%" }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                                <span>step {currentIdx}</span>
                                <span>{Math.round(progress)}%</span>
                                <span>{steps.length - 1} total</span>
                            </div>
                        </div>
                    </>}
                </div>
            )}

            {/* ── Compare mode ─────────────────────────────────────────────── */}
            {mode === "compare" && <CompareView n={n} speed={speed} />}

            {/* ── Charts mode ──────────────────────────────────────────────── */}
            {mode === "charts" && <ChartsView />}

            {/* ── About mode ───────────────────────────────────────────────── */}
            {mode === "about" && <AboutView />}

            {/* ── FAQ mode ─────────────────────────────────────────────────── */}
            {mode === "faq" && <FaqView />}

            {/* ── Single mode ──────────────────────────────────────────────── */}
            {mode === "single" && <>
                <StatsBar
                    steps={steps}
                    currentIdx={currentIdx}
                    onShowSolutions={() => setShowGallery(true)}
                    solutionCount={allSolutions.length}
                    solvedSoFar={solvedSoFar}
                />

                {showGallery && (
                    <SolutionsGallery
                        n={n}
                        solutions={allSolutions}
                        onClose={() => setShowGallery(false)}
                        onJumpTo={jumpToSolution}
                    />
                )}

                {!showGallery && (
                    <>
                        {step && (
                            <div style={{
                                padding: "8px 12px",
                                background: TYPE_META[step.type].tagBg,
                                borderRadius: "var(--border-radius-md)",
                                border: "0.5px solid",
                                borderColor: TYPE_META[step.type].tagBorder,
                                fontSize: 13,
                                color: TYPE_META[step.type].tagText,
                                fontWeight: 500,
                            }}>
                                {step.reason}
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" }}>
                            {card(<Board step={step} n={n} />, { display: "inline-block" })}

                            {card(
                                <div>
                                    <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
                                        {tabs.map(t => (
                                            <button key={t} onClick={() => setActiveTab(t)} style={{
                                                padding: "4px 12px", fontSize: 12, borderRadius: 99,
                                                border: activeTab === t ? "0.5px solid var(--color-border-info)" : "0.5px solid transparent",
                                                background: activeTab === t ? "var(--color-background-info)" : "transparent",
                                                color: activeTab === t ? "var(--color-text-info)" : "var(--color-text-secondary)",
                                                cursor: "pointer", fontWeight: activeTab === t ? 500 : 400,
                                            }}>
                                                {tabLabels[t]}
                                            </button>
                                        ))}
                                    </div>
                                    {activeTab === "log" && (
                                        <>{sectionLabel("Most recent events")}<DecisionLog steps={steps} currentIdx={currentIdx} /></>
                                    )}
                                    {activeTab === "stack" && (
                                        <>{sectionLabel(`Stack depth: ${step ? step.stackDepth + 1 : 0}`)}<CallStack step={step} n={n} /></>
                                    )}
                                    {activeTab === "tree" && (
                                        <>{sectionLabel("Search space explored so far")}<DecisionTree steps={steps} currentIdx={currentIdx} n={n} /></>
                                    )}
                                </div>
                                , { flex: 1 })}
                        </div>

                        {card(
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                                {[
                                    { bg: CELL.queenBg,     border: CELL.queenBorder,     text: CELL.queenText,     label: "Queen placed" },
                                    { bg: CELL.checkingBg,  border: CELL.checkingBorder,  text: CELL.checkingText,  label: "Checking" },
                                    { bg: CELL.conflictBg,  border: CELL.conflictBorder,  text: CELL.conflictText,  label: "Conflict" },
                                    { bg: CELL.backtrackBg, border: CELL.backtrackBorder, text: CELL.backtrackText, label: "Backtracking" },
                                    { bg: CELL.solutionBg,  border: CELL.solutionBorder,  text: CELL.solutionText,  label: "Solution" },
                                ].map(({ bg, border, text, label }) => (
                                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <div style={{
                                            width: 14, height: 14, borderRadius: 3,
                                            background: bg, border: `1px solid ${border}`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 9, color: text,
                                        }}>
                                            {(label === "Queen placed" || label === "Solution") ? "♛" : ""}
                                        </div>
                                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </>}
        </div>
    );
}