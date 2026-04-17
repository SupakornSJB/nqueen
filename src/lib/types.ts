export type StepType = "enter" | "check" | "place" | "conflict" | "prune" | "backtrack" | "exhaust" | "solution";
export type CellState = "empty" | "queen" | "checking" | "conflict" | "backtrack" | "solution";
export type SpeedKey = "slow" | "medium" | "fast" | "vfast";
export type TabKey = "log" | "stack" | "tree" | "depth";
export type VisitedState = "place" | "conflict" | "prune" | "solution";
export type MethodKey = "bt" | "ht" | "fc" | "bm";

export interface Step {
    type: StepType;
    board: number[];
    row: number;
    col: number;
    reason: string;
    stackDepth: number;
}

export interface TypeMeta {
    label: string;
    dot: string;
    tagBg: string;
    tagText: string;
    tagBorder: string;
}

export interface NodeColor {
    fill: string;
    stroke: string;
    text: string;
}