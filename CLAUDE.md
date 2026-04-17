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

Single-page React 19 + TypeScript app built with Vite.

```
src/
  App.tsx                          ← thin shell; mounts NQueensVisualizer + footer
  lib/
    types.ts                       ← shared types (Step, CellState, MethodKey, TabKey, etc.)
    constants.ts                   ← CELL colors, TYPE_META, SPEED_MS, METHOD_META
    algorithms.ts                  ← pure step-recorder functions + fast step counter (no React)
  store/
    complexityStore.ts             ← Zustand store; owns Web Worker lifecycle + result cache
  workers/
    complexity.worker.ts           ← background timing worker (batched runs, progress messages)
  components/nqueen/
    index.tsx                      ← NQueensVisualizer root; owns all state
    Board.tsx                      ← N×N grid, colours cells by CellState
    StatsBar.tsx                   ← counters: checks / placements / conflicts / backtracks
    SolutionsGallery.tsx           ← modal grid of all solutions with jump-to support
    CompareView.tsx                ← side-by-side algorithm race mode
    DecisionPanels.tsx             ← DecisionLog, CallStack, DecisionTree, RecursionDepthChart
    Charts.tsx                     ← ChartsView: step-count/runtime comparison across N
    About.tsx                      ← AboutView: algorithm cards with live complexity charts
    FAQ.tsx                        ← FaqView: static FAQ page
    Intro.tsx                      ← IntroView: home/landing screen
```

### App modes

`NQueensVisualizer` renders one of six modes via a segmented control:

| Mode      | Component     | Nav position | Description                                             |
|-----------|---------------|--------------|---------------------------------------------------------|
| `home`    | `IntroView`   | 1st          | Landing screen; clickable mode cards navigate directly  |
| `about`   | `AboutView`   | 2nd          | Expandable algorithm cards with complexity charts       |
| `single`  | inline        | 3rd          | Step-by-step visualizer: board + four analysis tabs     |
| `compare` | `CompareView` | 4th          | Side-by-side race between two algorithms                |
| `charts`  | `ChartsView`  | 5th          | Bar charts comparing step counts across N = 4–8        |
| `faq`     | `FaqView`     | 6th          | Static FAQ                                              |

Playback controls (N selector, speed) are hidden in `home`, `charts`, `about`, and `faq` modes. Algorithm picker and playback buttons are in a separate card from N/Speed in single mode (matches compare mode layout). Clicking Back or Step always pauses playback.

### Algorithm layer (`src/lib/algorithms.ts`)

Four pure step-recorder functions (no React). Steps are pre-computed on mount / N change; playback just advances `currentIdx` through the frozen array.

- **`buildSteps(n)`** — naive backtracking; O(N) isSafe scan per check; emits `enter | check | place | conflict | backtrack | exhaust | solution` steps
- **`buildStepsHT(n)`** — hash set backtracking; O(1) conflict check via three `Set<number>` objects (colSet / diagSet / antiDiagSet); same search tree as BT; emits the same step types
- **`buildStepsFC(n)`** — forward-checking; propagates domain pruning before each placement; emits `prune` instead of `conflict` for forward-looking rejections
- **`buildStepsBM(n)`** — bitmask; integer bitmasks for O(1) conflict detection, never visits invalid cells
- **`buildMethodSteps(method, n)`** — dispatcher for `MethodKey` (`"bt" | "ht" | "fc" | "bm"`)
- **`countStepsTotal(method, n)`** — allocation-free counter used by the complexity Web Worker; HT and FC use integer bitmask / undo-stack implementations for benchmark accuracy
- **`getAllSolutions(n)`** — enumerates all valid boards for the solutions gallery
- **`getCellState(step, row, col)`** — maps a step + grid position to a `CellState` for board rendering
- **`countStepStats(steps, upTo)`** — accumulates checks / placements / conflicts / backtracks / `avgDepth` up to a given index; counts `prune` steps as conflicts

### Step types and VisitedState

`StepType`: `enter | check | place | conflict | prune | backtrack | exhaust | solution`

- `conflict` — direct queen attack detected at the current cell (BT / HT)
- `prune` — forward-checking rejection: cell is safe now but would empty a future row's domain (FC only)

`VisitedState` (used by DecisionTree): `place | conflict | prune | solution`

Decision Tree colors: blue = placed, red = conflict, orange = pruned (FC), green = solution, grey = unvisited. On backtrack, the backtracked node and all nodes in deeper rows are cleared back to unvisited.

### Complexity & time

| Key | Time      | Space  | Notes |
|-----|-----------|--------|-------|
| bt  | O(N·N!)   | O(N)   | O(N) isSafe loop × O(N!) nodes |
| ht  | O(N!)     | O(N)   | O(1) set check × same O(N!) nodes as BT |
| fc  | O(N!)     | O(N²)  | N domain sets × N values; worst-case same node count as BT |
| bm  | O(N!)     | O(N)   | O(1) bit ops; never visits invalid cells |

`countStepsTotal` and `countAlgoStatsFast` use integer bitmask implementations for HT and FC (no JS Set/object allocation) to give accurate wall-clock benchmarks. `buildStepsHT` / `buildStepsFC` use real Set objects so the decision log can show human-readable set contents.

### Complexity chart & Web Worker (`src/store/complexityStore.ts`, `src/workers/complexity.worker.ts`)

The Algorithms page runs one background worker per method (bt / ht / fc / bm) the moment the page is opened. Workers:
- Use adaptive batching (600× for N=4, 1× for N=12+) to amortise timer resolution
- Stream `{ type: 'progress' }` messages after each N so the UI progress bar updates live
- Post a final `{ type: 'result' }` message with all data
- Results are cached in the Zustand store (`complexityStore`) — survives page navigation and card collapse/expand

N ranges per method: BT = 4–14, HT = 4–14, FC = 4–13, BM = 4–15.

The chart uses **semi-log scale** (linear X = N, log Y = relative runtime):
- N-Queens step counts grow approximately exponentially (`k^N`, not polynomially `N^k`)
- The exponential fit `ln(val) = a·N + b` is a geometrically straight line on the semi-log chart
- O(N!) reference curves upward above the fit (super-exponential growth)
- Scatter dots show individual timing runs; the best-fit line and median dots are overlaid

### Single mode tabs (`TabKey`)

Four tabs in the right-hand panel: `"log"` (Decision log), `"stack"` (Call stack), `"tree"` (Decision tree, N ≤ 6), `"depth"` (Recursion depth chart with moving-average overlay).

### Styling

All UI uses CSS custom properties defined in `src/index.css` (light + `prefers-color-scheme: dark` overrides). Board cell colours are hardcoded in the `CELL` constant in `src/lib/constants.ts` because they represent physical chess-square colours that must stay stable across modes.