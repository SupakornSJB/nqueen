# N-Queens Visualizer

An interactive step-by-step visualizer for the N-Queens problem, built with React and TypeScript. Watch backtracking algorithms solve the board in real time, compare their efficiency, and explore every decision the algorithm makes.

## Features

- **Two algorithms** — classic Backtracking and Forward Checking, selectable in single mode
- **Compare mode** — run both algorithms side-by-side as a live race, with a real-time efficiency comparison panel showing steps saved, conflicts pruned, and backtracks avoided
- **Step-by-step playback** — play, pause, step forward/back, or scrub through the full trace with a slider
- **Decision log** — a live feed of every algorithm event (enter, check, place, conflict, backtrack, solution), with the current event highlighted
- **Call stack view** — visualizes the recursive call stack depth at each step
- **Decision tree view** — shows the search space explored so far (available for N ≤ 6)
- **Solutions gallery** — browse all unique solutions for the chosen N, with miniboard previews and a jump-to button
- **Stats bar** — tracks placements, conflicts, and backtracks in real time, color-coded per metric
- **Dark mode** — full light/dark support via CSS custom properties

## Algorithms

### Backtracking
Places queens row by row, trying each column left to right. When a direct conflict is found (same column or diagonal as an already-placed queen), it moves to the next column. When all columns in a row fail, it backtracks to the previous row.

### Forward Checking
An optimized variant that, after placing each queen, propagates constraints forward: it removes the newly attacked squares from every future row's domain. If any future row's domain becomes empty, the branch is pruned immediately — before wasting time descending into it. This significantly reduces the number of nodes explored, especially for larger N.

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open `http://localhost:5173` in your browser.

```bash
# Type-check
npx tsc --noEmit

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## Deployment

The project deploys automatically to GitHub Pages on every push to `main` via GitHub Actions.

**One-time setup:**
1. Go to your repository → Settings → Pages
2. Set Source to **GitHub Actions**

The live site will be available at `https://<your-username>.github.io/nqueen/` after the first successful workflow run.

If your repository is named something other than `nqueen`, update the `base` field in `vite.config.ts` to match.

## Project Structure

```
src/
  components/
    Nqueen.tsx     # All visualizer logic and UI (single file)
  App.tsx
  index.css        # CSS custom properties (semantic color tokens, dark mode)
  App.css
.github/
  workflows/
    deploy.yml     # GitHub Pages deployment workflow
```

## Built With

- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev)

Built with [Claude](https://claude.ai) by Anthropic.