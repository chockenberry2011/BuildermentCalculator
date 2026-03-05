# Builderment Resource Calculator

A companion tool for the [Builderment](https://builderment.com) factory-building game. It automates the math you'd otherwise do with pen and paper — calculating building counts, raw resource requirements, belt utilization, and optimal production scales based on the game's current formulas and data.

This is a planning aid, not a substitute for understanding your factory. All calculations reflect today's game mechanics and may not account for future balance changes. Use it to save time on arithmetic and verify your designs, but always sanity-check the results against your actual in-game setup.

## Features

**Production Calculation**
- Recursive production chain solver with exact rational arithmetic (no floating-point rounding errors)
- Single or multi-target production planning
- Alternate recipe selection for items with multiple crafting paths
- Configurable building tech levels (Lv1-5 speed multipliers)

**Rate Optimization**
- Finds production rates that yield integer building counts (no fractional factories)
- Suggests "simplest" rates with splitter-friendly fractions (1/2, 1/3, 1/4)
- Auto-integer mode applies the recommended rate automatically
- Scale suggestions for individual fractional counts with side-effect analysis

**Belt Analysis**
- Calculates belt requirements for each production connection
- Highlights multi-belt connections and near-capacity utilization
- Configurable belt speed (165-480 items/min or custom)

**Splitter Info**
- For fractional building counts, shows the practical splitter layout (e.g., "5 + 1/3" means build 6, last one splits 1-of-3)
- Color-coded count display based on fraction complexity

**Resource Constraints**
- Reverse calculation: set extractor counts and find the maximum achievable output
- Bottleneck detection with utilization tracking

**Visualization**
- **Tree view**: hierarchical production chain with inline building counts, belt badges, and split info
- **Blueprint view**: interactive node graph (drag, zoom, pan) showing the full production flow
- **Summary table**: raw resources and building totals at a glance

**Sharing & Persistence**
- Full calculator state encoded in URL parameters for shareable builds
- Local storage persistence for settings, recipes, and configurations
- Export production plans as text

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173` with hot module replacement.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

### Run Tests

```bash
npm test          # watch mode
npm run test:run  # single run
```

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
  components/           UI components (React + Tailwind)
    blueprint/          Interactive graph view (XYFlow)
  core/                 Calculation engine
    math/               Rational arithmetic, GCD/LCM
    __tests__/          Unit tests for core logic
  data/                 Game data (items, recipes, buildings, belts)
    __tests__/          Data validation tests
  store/                Zustand state management + URL sync
  App.tsx               Root layout
```

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — build tool and dev server
- **Zustand** — state management with persistence
- **@xyflow/react** — interactive node graph for blueprint view
- **Tailwind CSS** — utility-first styling
- **Vitest** — unit testing

## Disclaimer

Not affiliated with Builderment or its developers. Game data and formulas are based on the current version of Builderment and may become outdated as the game is updated. Always verify results against your in-game experience.
