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

| Mode | Description |
|------|-------------|
| **Single** | Step through one algorithm at your own pace with playback controls and a scrubber |
| **Compare** | Race any two of the three algorithms side-by-side at the same step cadence |
| **Charts** | 2×4 bar chart grid + data table comparing all three algorithms across N = 4–8, including runtime in µs |
| **About** | Plain-English explanation of each algorithm with expandable comparison summaries |
| **FAQ** | Accordion Q&A covering the problem, algorithms, metrics, and visualizer features |

## Algorithms

| Key | Name | Highlight |
|-----|------|-----------|
| `bt` | Backtracking | Simplest; checks every cell and backtracks on conflict |
| `fc` | Forward Checking (Pruning) | Maintains per-row domains; prunes when a future row empties |
| `bm` | Bitmask | Uses integer bitmasks for O(1) conflict detection; never visits invalid cells |

## Source layout

```
src/
  App.tsx                     — root; mounts NQueensVisualizer
  index.css                   — global CSS custom properties (light + dark)
  main.tsx                    — React entry point
  lib/
    types.ts                  — shared TypeScript types
    constants.ts              — CELL colours, TYPE_META, SPEED_MS, METHOD_META
    algorithms.ts             — buildSteps, buildStepsFC, buildStepsBM, helpers
  components/
    nqueen/
      Board.tsx               — Board + MiniBoard components
      SolutionsGallery.tsx    — modal grid of all solutions
      DecisionPanels.tsx      — CallStack, DecisionLog, DecisionTree tabs
      StatsBar.tsx            — live counters (steps, placements, conflicts, backtracks)
      CompareView.tsx         — MethodSide, ComparisonBar, CompareView
      Charts.tsx              — BarChart, ChartsView, runtime measurement
      About.tsx               — expandable algorithm explanation cards
      FAQ.tsx                 — accordion Q&A
      index.tsx               — NQueensVisualizer main component (default export)
```

## Deployment

Deploys automatically to GitHub Pages on every push to `main` via GitHub Actions (`.github/workflows/deploy.yml`).

**One-time setup:** Repository → Settings → Pages → Source: **GitHub Actions**

The live site is available at `https://<your-username>.github.io/nqueen/`. If the repository name differs, update the `base` field in `vite.config.ts`.

## Built With

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)

Built with [Claude](https://claude.ai) by Anthropic.