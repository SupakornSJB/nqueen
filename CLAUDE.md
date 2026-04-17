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
    types.ts                       ← shared types (Step, CellState, MethodKey, etc.)
    constants.ts                   ← CELL colors, TYPE_META, SPEED_MS, METHOD_META
    algorithms.ts                  ← pure step-recorder functions (no React)
  components/nqueen/
    index.tsx                      ← NQueensVisualizer root; owns all state
    Board.tsx                      ← N×N grid, colours cells by CellState
    StatsBar.tsx                   ← counters: checks / placements / conflicts / backtracks
    SolutionsGallery.tsx           ← modal grid of all solutions with jump-to support
    CompareView.tsx                ← side-by-side algorithm race mode
    DecisionPanels.tsx             ← DecisionLog, CallStack, DecisionTree tabs
    Charts.tsx                     ← ChartsView: step-count comparison across N
    About.tsx                      ← AboutView: static explainer page
    FAQ.tsx                        ← FaqView: static FAQ page
    Intro.tsx                      ← IntroView: home/landing screen
```

### App modes

`NQueensVisualizer` renders one of six modes via a segmented control:

| Mode      | Component     | Description                                      |
|-----------|---------------|--------------------------------------------------|
| `home`    | `IntroView`   | Landing screen with "Get Started" CTA            |
| `single`  | inline        | Step-by-step visualizer with board + panels      |
| `compare` | `CompareView` | Side-by-side race between two algorithms         |
| `charts`  | `ChartsView`  | Bar charts comparing step counts across N values |
| `about`   | `AboutView`   | Static explainer                                 |
| `faq`     | `FaqView`     | Static FAQ                                       |

Playback controls (N selector, speed, algorithm picker, play/pause/step/scrubber) are hidden in `home`, `charts`, `about`, and `faq` modes.

### Algorithm layer (`src/lib/algorithms.ts`)

Three pure step-recorder functions (no React). Steps are pre-computed on mount / N change; playback just advances `currentIdx` through the frozen array.

- **`buildSteps(n)`** — classic backtracking; emits `enter | check | place | conflict | backtrack | exhaust | solution` steps
- **`buildStepsFC(n)`** — forward-checking variant; propagates domain pruning before each placement, skips branches where any future row loses all valid columns
- **`buildStepsBM(n)`** — bitmask variant; uses integer bitmasks for O(1) conflict detection, never visits invalid cells
- **`buildMethodSteps(method, n)`** — dispatcher that calls the correct builder for a `MethodKey` (`"bt" | "fc" | "bm"`)
- **`getAllSolutions(n)`** — enumerates all valid boards for the solutions gallery
- **`getCellState(step, row, col)`** — maps a step + grid position to a `CellState` for board rendering
- **`countStepStats(steps, upTo)`** — accumulates check / placement / conflict / backtrack counts up to a given index

### Styling

All UI uses CSS custom properties defined in `src/index.css` (light + `prefers-color-scheme: dark` overrides). Board cell colours are hardcoded in the `CELL` constant in `src/lib/constants.ts` because they represent physical chess-square colours that must stay stable across modes.