/**
 * Lap color palette for map polylines.
 * Uses vibrant, distinct hex colors that work with both Canvas and SVG renderers.
 * Designed to be readable against light (Voyager) and dark (Dark Matter) tile backgrounds.
 */

const COLORS_LIGHT = [
  '#c0392b', // terra red
  '#1a8a5c', // forest green
  '#2471a3', // steel blue
  '#d4740e', // amber orange
  '#7d3c98', // plum purple
  '#148f77', // teal
  '#b9770e', // dark gold
  '#2e4053', // slate
]

const COLORS_DARK = [
  '#e74c3c', // bright red
  '#2ecc71', // emerald
  '#3498db', // bright blue
  '#f39c12', // orange
  '#9b59b6', // violet
  '#1abc9c', // turquoise
  '#f1c40f', // yellow
  '#5dade2', // light blue
]

/** Get the polyline color for a given lap index (cycles through palette). */
export function getLapColor(index: number, isDark: boolean): string {
  const palette = isDark ? COLORS_DARK : COLORS_LIGHT
  return palette[index % palette.length]
}
