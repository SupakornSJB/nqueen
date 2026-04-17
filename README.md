# N-Queens Visualizer

An interactive step-by-step visualizer for three N-Queens solving algorithms, built with React 19 + TypeScript + Vite.

## Getting Started

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev       # start dev server at http://localhost:5173
npm run build     # type-check + production build
npm run lint      # ESLint
npm run preview   # preview production build locally
```

## Modes

Nav bar order: **Home → Algorithms → Single → Compare → Charts → FAQ**

| Mode | Description |
|------|-------------|
| **Home** | Landing page — what N-Queens is, a solved example board, and a clickable overview of all modes |
| **Algorithms** | Expandable cards for each algorithm with plain-English explanations, comparison summaries, and a live time-complexity chart (scatter + exponential best-fit vs O(N!) reference, computed in a Web Worker) |
| **Single** | Step through one algorithm at your own pace with playback controls, a scrubber, and four analysis tabs: Decision log, Call stack, Tree view, Depth chart |
| **Compare** | Race any two algorithms side-by-side at the same step cadence; efficiency comparison table includes avg depth |
| **Charts** | 2×4 bar chart grid + raw data table comparing all three algorithms across N = 4–8, including runtime in µs |
| **FAQ** | Accordion Q&A covering the problem, algorithms, metrics, and visualizer features |

## Algorithms

| Key | Name | Complexity | Highlight |
|-----|------|------------|-----------|
| `bt` | Backtracking | O(N!) time · O(N) space | Simplest; checks every cell and backtracks on conflict |
| `fc` | Forward Checking | O(N!) time · O(N²) space | Maintains per-row domains; prunes when any future row empties |
| `bm` | Bitmask | O(N!) time · O(N) space | Integer bitmasks for O(1) conflict detection; never visits invalid cells |

## Source layout

```
src/
  App.tsx                     — root; mounts NQueensVisualizer
  index.css                   — global CSS custom properties (light + dark)
  main.tsx                    — React entry point
  lib/
    types.ts                  — shared TypeScript types (Step, CellState, MethodKey, TabKey…)
    constants.ts              — CELL colours, TYPE_META, SPEED_MS, METHOD_META
    algorithms.ts             — buildSteps, buildStepsFC, buildStepsBM, countStepsTotal, helpers
  store/
    complexityStore.ts        — Zustand store; owns Web Worker lifecycle + result cache
  workers/
    complexity.worker.ts      — background timing worker (batched runs, progress streaming)
  components/
    nqueen/
      Board.tsx               — N×N grid, colours cells by CellState
      SolutionsGallery.tsx    — modal grid of all solutions with jump-to support
      DecisionPanels.tsx      — DecisionLog, CallStack, DecisionTree, RecursionDepthChart
      StatsBar.tsx            — live counters (steps, placements, conflicts, backtracks)
      CompareView.tsx         — MethodSide, ComparisonBar, CompareView
      Charts.tsx              — BarChart, ChartsView, runtime measurement
      About.tsx               — algorithm cards with live complexity charts (uses Zustand store)
      FAQ.tsx                 — accordion Q&A
      Intro.tsx               — home / landing page
      index.tsx               — NQueensVisualizer root component
```

## Deployment

Deploys automatically to GitHub Pages on every push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

**One-time setup:** Repository → Settings → Pages → Source: **GitHub Actions**

The live site is available at `https://<your-username>.github.io/nqueen/`. If the repository name differs, update the `base` field in `vite.config.ts`.

## Built With

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Zustand](https://zustand-demo.pmnd.rs) — global state for complexity chart cache

Built with [Claude](https://claude.ai) by Anthropic.