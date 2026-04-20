# N-Queens Visualizer

An interactive step-by-step visualizer for four N-Queens solving algorithms, built with React 19 + TypeScript + Vite.

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
| **Charts** | 2×4 bar chart grid + raw data table comparing all four algorithms across N = 4–8, including runtime in µs |
| **FAQ** | Accordion Q&A covering the problem, algorithms, metrics, and visualizer features |

## Algorithms

| Key | Name | Time | Space | Highlight |
|-----|------|------|-------|-----------|
| `bt` | Naive Backtracking | O(N·N!) | O(N) | Simplest; O(N) isSafe scan per check, backtracks on conflict |
| `ht` | Hash Backtracking | O(N!) | O(N) | Same search tree as BT; O(1) conflict check via three hash sets (col / diag / anti-diag) |
| `fc` | Forward Checking | O(N!) | O(N²) | Maintains per-row domains; prunes when any future row's domain empties |
| `bm` | Bitmask | O(N!) | O(N) | Integer bitmasks for O(1) conflict detection; never visits invalid cells |

N ranges: BT = 4–14, HT = 4–14, FC = 4–13, BM = 4–15.

## Decision Tree colors

| Color | Meaning |
|-------|---------|
| Blue | Currently placed queen |
| Red | Direct conflict (BT / HT) |
| Orange | Pruned by forward look-ahead (FC only) |
| Green | Part of a found solution |
| Grey | Not yet visited |

## Source layout

```
src/
  App.tsx                     — root; mounts NQueensVisualizer
  index.css                   — global CSS custom properties (light + dark)
  main.tsx                    — React entry point
  lib/
    types.ts                  — shared TypeScript types (Step, CellState, MethodKey, TabKey…)
    constants.ts              — CELL colours, TYPE_META, SPEED_MS, METHOD_META
    algorithms.ts             — buildSteps, buildStepsHT, buildStepsFC, buildStepsBM,
                                countStepsTotal, getAllSolutions, getCellState, countStepStats
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

**Note: This live site is already available at https://supakornsjb.github.io/nqueen/, This section is only if you want to deploy your own version from your own fork.**

Deploys automatically to GitHub Pages on every push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

**One-time setup:** Repository → Settings → Pages → Source: **GitHub Actions**

If you choose to deploy your version using the available GitHub Workflow, the live site will be available at `https://<your-username>.github.io/nqueen/`. If the repository name differs, update the `base` field in `vite.config.ts`.

## Built With

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)
- [Zustand](https://zustand-demo.pmnd.rs) — global state for complexity chart cache

## AI Disclosure

This project is built mostly with [Claude](https://claude.ai) Code (Sonnet 4.6) by Anthropic.
