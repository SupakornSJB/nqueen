import type { StepType, TypeMeta, SpeedKey, MethodKey } from "./types";

// Board cell colors are hardcoded (physical-color scene — intentionally stable across modes).
// All surrounding UI uses CSS custom properties for full dark-mode compatibility.
export const CELL: Record<string, string> = {
    queenBg:       "#1e3d1a", queenBorder:    "#4a7c3f", queenText:    "#c0dd97",
    checkingBg:    "#0d2a47", checkingBorder: "#2a6aaa", checkingText: "#b5d4f4",
    conflictBg:    "#3d1010", conflictBorder: "#8b2020", conflictText: "#f7c1c1",
    backtrackBg:   "#3d2800", backtrackBorder:"#8b6200", backtrackText:"#fac775",
    solutionBg:    "#0d3020", solutionBorder: "#1a6a50", solutionText: "#9fe1cb",
};

export const TYPE_META: Record<StepType, TypeMeta> = {
    enter:     { label: "Enter",     dot: "var(--color-text-info)",    tagBg: "var(--color-background-info)",    tagText: "var(--color-text-info)",    tagBorder: "var(--color-border-info)" },
    check:     { label: "Check",     dot: "var(--color-text-info)",    tagBg: "var(--color-background-info)",    tagText: "var(--color-text-info)",    tagBorder: "var(--color-border-info)" },
    place:     { label: "Place",     dot: "var(--color-text-success)", tagBg: "var(--color-background-success)", tagText: "var(--color-text-success)", tagBorder: "var(--color-border-success)" },
    conflict:  { label: "Conflict",  dot: "var(--color-text-danger)",  tagBg: "var(--color-background-danger)",  tagText: "var(--color-text-danger)",  tagBorder: "var(--color-border-danger)" },
    backtrack: { label: "Backtrack", dot: "var(--color-text-warning)", tagBg: "var(--color-background-warning)", tagText: "var(--color-text-warning)", tagBorder: "var(--color-border-warning)" },
    exhaust:   { label: "Exhaust",   dot: "var(--color-text-danger)",  tagBg: "var(--color-background-danger)",  tagText: "var(--color-text-danger)",  tagBorder: "var(--color-border-danger)" },
    solution:  { label: "Solution",  dot: "var(--color-text-success)", tagBg: "var(--color-background-success)", tagText: "var(--color-text-success)", tagBorder: "var(--color-border-success)" },
};

export const SPEED_MS: Record<SpeedKey, number> = { slow: 600, medium: 200, fast: 60, vfast: 16 };

export const METHOD_META: Record<MethodKey, { name: string; desc: string; accent: string; accentBg: string; accentBorder: string }> = {
    bt: {
        name: "Backtracking",
        desc: "Tries every column, backtracks only on direct queen conflict",
        accent: "#f59e0b",
        accentBg: "rgba(245,158,11,0.10)",
        accentBorder: "rgba(245,158,11,0.38)",
    },
    fc: {
        name: "Forward Checking (Pruning)",
        desc: "Prunes branches when any future row loses all valid columns",
        accent: "#10b981",
        accentBg: "rgba(16,185,129,0.10)",
        accentBorder: "rgba(16,185,129,0.38)",
    },
    bm: {
        name: "Bitmask",
        desc: "Uses integer bitmasks for O(1) conflict detection — never visits invalid cells",
        accent: "#8b5cf6",
        accentBg: "rgba(139,92,246,0.10)",
        accentBorder: "rgba(139,92,246,0.38)",
    },
};