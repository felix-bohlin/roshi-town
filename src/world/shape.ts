// Drawing land and water: polygons and blobs with noisy edges, thick lines, and a distance field.
// Everything takes tile coordinates and writes tiles through the Builder.

import { noise } from '../engine/rng'
import { idx, isWet, type Builder, type Tile } from './layout'

export type P = readonly [number, number]

function inPoly(x: number, y: number, pts: readonly P[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * Fill a polygon, its edge wobbled by noise of amplitude `jitter` tiles (so coasts look drawn, not
 * ruled). Calls `each` for every tile filled. `over` limits it to tiles of those types.
 */
export function fillPoly(B: Builder, pts: readonly P[], tile: Tile, o: { jitter?: number; seed?: number; over?: number[]; each?: (x: number, y: number) => void } = {}): void {
  const j = o.jitter ?? 0
  const seed = o.seed ?? 1
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - j - 1))
  const x1 = Math.min(B.w - 1, Math.ceil(Math.max(...xs) + j + 1))
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - j - 1))
  const y1 = Math.min(B.h - 1, Math.ceil(Math.max(...ys) + j + 1))
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = j ? (noise(x / 7, y / 7, seed) - 0.5) * 2 * j + (noise(x / 2.5, y / 2.5, seed + 9) - 0.5) * j * 0.5 : 0
      const dy = j ? (noise(x / 7, y / 7, seed + 1) - 0.5) * 2 * j + (noise(x / 2.5, y / 2.5, seed + 10) - 0.5) * j * 0.5 : 0
      if (!inPoly(x + 0.5 + dx, y + 0.5 + dy, pts)) continue
      if (o.over && !o.over.includes(B.get(x, y))) continue
      B.set(x, y, tile)
      o.each?.(x, y)
    }
}

/** An ellipse with a noisy edge. */
export function blob(B: Builder, cx: number, cy: number, rx: number, ry: number, tile: Tile, o: { jitter?: number; seed?: number; over?: number[]; each?: (x: number, y: number) => void } = {}): void {
  const pts: P[] = []
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  fillPoly(B, pts, tile, o)
}

/** A thick polyline (rivers, channels, causeways). */
export function line(B: Builder, pts: readonly P[], width: number, tile: Tile, o: { over?: number[]; each?: (x: number, y: number) => void } = {}): void {
  const r = width / 2
  for (let k = 0; k + 1 < pts.length; k++) {
    const [ax, ay] = pts[k]
    const [bx, by] = pts[k + 1]
    const len = Math.hypot(bx - ax, by - ay)
    for (let s = 0; s <= len; s += 0.5) {
      const cx = ax + ((bx - ax) * s) / len
      const cy = ay + ((by - ay) * s) / len
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) continue
          if (!B.inside(x, y) || (o.over && !o.over.includes(B.get(x, y)))) continue
          B.set(x, y, tile)
          o.each?.(x, y)
        }
    }
  }
}

/** Distance (in tiles, 4-connected) from every tile to the nearest water tile; water is 0. */
export function waterDistance(B: Builder): Int16Array {
  const d = new Int16Array(B.w * B.h).fill(32767)
  const q: number[] = []
  for (let i = 0; i < d.length; i++)
    if (isWet(B.tiles[i])) {
      d[i] = 0
      q.push(i)
    }
  for (let h = 0; h < q.length; h++) {
    const i = q[h]
    const x = i % B.w
    const y = (i / B.w) | 0
    for (const [nx, ny] of [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ]) {
      if (!B.inside(nx, ny)) continue
      const j = idx(nx, ny)
      if (d[j] <= d[i] + 1) continue
      d[j] = d[i] + 1
      q.push(j)
    }
  }
  return d
}
