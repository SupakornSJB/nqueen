# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
npm run preview   # preview production build locally
```

## Architecture

Single-page React 19 + TypeScript app built with Vite. The entire application lives in two files:

- **`src/components/Nqueen.tsx`** — all logic and UI; no external state library
- **`src/App.tsx`** — thin shell that mounts `NQueensVisualizer` and renders a footer

### Component tree inside `Nqueen.tsx`

```
NQueensVisualizer          ← root; owns all state (n, steps, playback, mode, method)
  ├── CompareView          ← side-by-side BT vs FC race mode
  │     ├── MethodSide     ← per-algorithm panel with board + stats + progress bar
  │     └── ComparisonBar  ← efficiency metrics table
  ├── StatsBar             ← counters: placements / conflicts / backtracks / solutions
  ├── SolutionsGallery     ← modal grid of all solutions with jump-to support
  ├── Board                ← N×N grid, colours cells by CellState
  ├── DecisionLog          ← scrolling event list (last 40 steps)
  ├── CallStack            ← recursive solve() frame visualisation
  └── DecisionTree         ← SVG tree (disabled for N > 6)
```

### Algorithm layer

Two pure step-recorder functions (no React):

- **`buildSteps(n)`** — classic backtracking; emits `enter | check | place | conflict | backtrack | exhaust | solution` steps
- **`buildStepsFC(n)`** — forward-checking variant; propagates domain pruning before each placement
- **`getAllSolutions(n)`** — enumerates all valid boards for the solutions gallery

Steps are pre-computed on mount / N change; playback just advances `currentIdx` through the frozen array.

### Styling

All UI uses CSS custom properties defined in `src/index.css` (light + `prefers-color-scheme: dark` overrides). Board cell colours are hardcoded in the `CELL` constant in `Nqueen.tsx` because they represent physical chess-square colours that must stay stable across modes.