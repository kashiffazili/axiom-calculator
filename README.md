# AXIOM — Scientific Calculator & Equation Solver

> A precision math workspace for scientific calculations, equation solving, graphing, and matrix operations — built to run entirely in the browser.

![AXIOM](https://img.shields.io/badge/AXIOM-Scientific%20Math%20Tool-black?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## Overview

**AXIOM** is a browser-based mathematical toolkit that brings a scientific calculator, equation solver, graphing workspace, and matrix studio together in one interface.

The application is **client-side only**: calculations run locally in the browser, with no backend, database, account, or API key required.

## Features

### Scientific Calculator

- Custom expression parser with implicit multiplication
- Powers and factorials via the gamma function
- Trigonometric functions with **DEG / RAD** modes
- Logarithms, percentages, `nCr`, and `nPr`
- `Ans` memory
- Keyboard input
- Persistent calculation history

### Equation Solver

- **General equations:** solve `f(x) = 0` using bisection and Newton–Raphson methods
- **Polynomial equations:** find real and complex roots using Durand–Kerner iteration for degrees 1–6
- **Linear systems:** solve 2×2 and 3×3 systems with Cramer's rule and working
- Auto-scaled SVG graphs for equations and intersections

### Matrix Studio

- Determinant with elimination steps
- Inverse and transpose
- Trace and rank
- RREF / Gauss–Jordan elimination
- Matrix powers `A^x` for integer exponents
- Negative powers through `A⁻¹`
- Scalar operations
- Matrix addition and subtraction
- Matrix multiplication
- Matrices up to 4×4

## Tech Stack

- **React 19** — UI
- **TypeScript** — application logic and type safety
- **Vite** — development and production tooling
- **Tailwind CSS 4** — styling
- **Framer Motion** — animations
- **Lucide React** — icons

## Project Structure

```text
axiom-calculator/
├── .github/
│   └── workflows/
│       └── build.yml
├── src/
│   ├── components/
│   │   ├── CalculatorTab.tsx
│   │   ├── Display.tsx
│   │   ├── EquationTab.tsx
│   │   ├── Graph.tsx
│   │   ├── HistoryPanel.tsx
│   │   ├── Keypad.tsx
│   │   ├── MatrixTab.tsx
│   │   └── ui.tsx
│   ├── lib/math/
│   │   ├── complex.ts
│   │   ├── matrix.ts
│   │   ├── parser.ts
│   │   └── solvers.ts
│   ├── utils/
│   │   └── cn.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── index.html
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## Run Locally

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm

### 1. Clone the repository

```bash
git clone https://github.com/kashiffazili/axiom-calculator.git
cd axiom-calculator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

### 4. Create a production build

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

The project uses `vite-plugin-singlefile`, so the production build is packaged as a self-contained `dist/index.html`.

## Deployment

AXIOM can be deployed to platforms such as **Vercel**, **Netlify**, or **GitHub Pages**.

For a portfolio project, a live deployment is recommended so visitors can try the calculator directly from your GitHub repository.

## Math Engine

The core mathematical implementation is kept separate from the UI in `src/lib/math/`:

| File | Purpose |
| --- | --- |
| `parser.ts` | Tokenization, recursive-descent parsing, and expression evaluation |
| `solvers.ts` | Bisection, Newton–Raphson, and Durand–Kerner methods |
| `matrix.ts` | Gaussian elimination, Gauss–Jordan, RREF, Cramer's rule, and matrix powers |
| `complex.ts` | Complex-number operations used by polynomial solving |

## Continuous Integration

A GitHub Actions workflow runs `npm ci` and `npm run build` on pushes and pull requests to `main`. This helps catch broken builds before changes are merged.

## Privacy

AXIOM is designed to operate entirely in the browser. No account, backend, database, or API key is required for calculations.

## License

This project is licensed under the **MIT License**. See [`LICENSE`](LICENSE) for the full license text.

## Author

**Mohammad Kashif Fazili**

---

If you find AXIOM useful, consider giving the repository a ⭐ on GitHub.
