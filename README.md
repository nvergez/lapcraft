# GPX Editor

A browser-based editor for GPX and TCX activity files. Upload a file, edit laps (split, merge, rename, reorder, delete), and export — all without losing any original XML data.

## Features

- **Lossless round-trip editing** — the original XML DOM is kept in memory and mutated directly, so unknown elements, attributes, and formatting are preserved on export
- **Split laps** — pick a trackpoint to split a lap into two
- **Merge laps** — combine adjacent laps into one
- **Rename laps** — inline name editing
- **Reorder & delete laps**
- **Cross-format export** — convert GPX to TCX or vice versa (lossy, with confirmation)
- **Stats** — distance (haversine), duration, elevation, and pace computed per lap
- **Dark mode** — automatic light/dark theme support

## Getting Started

Requires **Node 24** and **pnpm**.

```bash
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3000`.

## Scripts

| Command        | Description                                     |
| -------------- | ----------------------------------------------- |
| `pnpm dev`     | Start the Vite dev server                       |
| `pnpm build`   | Production build (Vite + TypeScript type check) |
| `pnpm preview` | Preview the production build locally            |
| `pnpm start`   | Run the production server                       |

## Tech Stack

- [TanStack Start](https://tanstack.com/start) (SSR via Nitro) + [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org) (strict mode)
- [TailwindCSS v4](https://tailwindcss.com) with oklch color themes
- [shadcn/ui](https://ui.shadcn.com) components (built on Base UI, not Radix)
- [Lucide](https://lucide.dev) icons

## How It Works

When a GPX or TCX file is uploaded, it is parsed into a live DOM `Document` that stays in memory for the entire editing session. Every edit operation (split, merge, rename, reorder, delete) mutates the DOM directly rather than converting to an intermediate data model. This means the exported file retains all original structure — custom extensions, metadata, and attributes pass through untouched.

A `revision` counter triggers React recomputation of derived state (lap handles, stats) after each mutation.

Cross-format exports (GPX → TCX or TCX → GPX) necessarily lose format-specific data and require explicit user confirmation.

## License

[MIT](./LICENSE)
