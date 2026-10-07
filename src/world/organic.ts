// Helpers for building villages: bridges and gates, packing houses along the lanes (lots) and
// taking out any whose door ended up cut off (prune), and dressing leftover ground (yards).
//
// Buildings are drawn front-on with the door at the bottom, so a lot only needs a street (or the
// tile in front of its door) below it; streets may run any way.

import { hash, pick, type Rng } from '../engine/rng'
import { idx, isWet, T, type Builder, type Building, type Pt, type TreeKind } from './layout'
import type { Lot } from './plan'
import { rect } from './plan'
import type { Dir } from './layout'

const STREETS = new Set<number>([T.Road, T.Stone, T.Gravel, T.Bridge, T.Pier])
/** House kinds that look fine a little narrower or lower than asked. */
const FLEX = new Set<string>(['machiya', 'nagaya', 'minka', 'minkaOld', 'cottage', 'kura'])

// ---------------------------------------------------------------------------------------------
// Bridges and gates
// ---------------------------------------------------------------------------------------------

/**
 * A straight bridge `width` tiles wide from (x0, y0) to (x1, y1) (one of them the same), laid over
 * the water between. Returns the land tile at each end, just off the bridge.
 */
export function bridge(B: Builder, x0: number, y0: number, x1: number, y1: number, width: number): { a: Pt; b: Pt } {
  const vertical = x0 === x1
  const n = Math.abs(vertical ? y1 - y0 : x1 - x0)
  const sx = vertical ? 0 : Math.sign(x1 - x0)
  const sy = vertical ? Math.sign(y1 - y0) : 0
  let first = -1
  let last = -1
  for (let k = 0; k <= n; k++) {
    let wet = false
    for (let w = 0; w < width; w++) {
      const x = x0 + sx * k + (vertical ? w : 0)
      const y = y0 + sy * k + (vertical ? 0 : w)
      if (isWet(B.get(x, y))) {
        B.set(x, y, T.Bridge)
        wet = true
      } else if (B.get(x, y) === T.Bridge) wet = true
    }
    if (wet) {
      if (first < 0) first = k
      last = k
    }
  }
  const at = (k: number): Pt => ({ x: x0 + sx * k, y: y0 + sy * k })
  return { a: at(Math.max(0, first - 1)), b: at(Math.min(n, last + 1)) }
}

/**
 * A gate in a wall (or over a moat), where a road or bridge passes through. `land` is the first land tile off the bridge
 * (its left/top column); `toWater` the direction from the land out over the bridge.
 */
export function gate(B: Builder, id: string, name: string, land: Pt, toWater: Dir, bw: number, text: string[], variant?: string): Building {
  const g = makeGate(B, id, name, land, toWater, bw, text, variant)
  // The passage stays open (and paved, so walls and houses leave it alone).
  for (const p of g.open ?? []) {
    B.taken[idx(p.x, p.y)] = 0
    B.set(p.x, p.y, isWet(B.get(p.x, p.y)) ? T.Bridge : T.Stone)
  }
  return g
}

function makeGate(B: Builder, id: string, name: string, land: Pt, toWater: Dir, bw: number, text: string[], variant?: string): Building {
  if (toWater === 'up' || toWater === 'down') {
    const y = toWater === 'up' ? land.y : land.y - 2
    return B.building({
      id,
      kind: 'gate',
      variant,
      name,
      x: land.x - 2,
      y,
      w: bw + 4,
      h: 3,
      door: { x: land.x + Math.floor(bw / 2), y: toWater === 'up' ? y + 3 : y - 1 },
      open: rect(land.x, y, bw, 3),
      text,
    })
  }
  const x = toWater === 'left' ? land.x : land.x - 2
  return B.building({
    id,
    kind: 'gateSide',
    name,
    x,
    y: land.y - 2,
    w: 3,
    h: bw + 4,
    door: { x: toWater === 'left' ? x + 3 : x - 1, y: land.y + Math.floor(bw / 2) },
    open: rect(x, land.y, 3, bw),
    text,
  })
}


const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]


// ---------------------------------------------------------------------------------------------
// Lots
// ---------------------------------------------------------------------------------------------

export interface LotOptions {
  ok: (x: number, y: number) => boolean
  /** Tile types houses may stand on. */
  ground: number[]
  pool: (x: number, y: number, r: Rng) => Lot | null
  /** Neighbourhood a house belongs to (for passers-by homes and spots). */
  group: (x: number, y: number) => string
  prefix: string
  /** Fraction of candidate corners tried (lower = sparser). */
  density?: number
  spotEvery?: number
  /** Only doors on or right next to a street (sparser, tidier: villages). */
  nearStreet?: boolean
  /** Tiles kept clear of other buildings and props all round (room for a garden). */
  margin?: number
}

/** Pack houses wherever they fit with open ground (or a street) in front of the door. */
export function lots(B: Builder, r: Rng, reserved: Uint8Array, o: LotOptions): Building[] {
  const out: Building[] = []
  const ground = new Set(o.ground)
  // Places people stand stay clear.
  for (const p of Object.values(B.places)) if (B.inside(p.x, p.y)) reserved[idx(p.x, p.y)] = 1
  const free = (x: number, y: number) => B.inside(x, y) && o.ok(x, y) && ground.has(B.get(x, y)) && !B.isTaken(x, y) && !reserved[idx(x, y)]
  const cands: number[] = []
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (free(x, y) && r() < (o.density ?? 1)) cands.push(idx(x, y))
  for (let k = cands.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1))
    ;[cands[k], cands[j]] = [cands[j], cands[k]]
  }
  let sinceSpot = 0
  for (const c of cands) {
    const x = c % B.w
    const y = (c / B.w) | 0
    if (!free(x, y)) continue
    const lot = o.pool(x, y, r)
    if (!lot) continue
    let placed: { w: number; h: number } | null = null
    for (let w = lot.w; w >= Math.min(4, lot.w) && !placed; w--)
      for (let h = lot.h; h >= Math.min(4, lot.h) && !placed; h--) {
        if (!FLEX.has(lot.kind) && (w !== lot.w || h !== lot.h)) continue
        if (lot.kind === 'nagaya' && w < 9) break
        let fits = true
        for (let j = y; j < y + h && fits; j++) for (let i = x; i < x + w && fits; i++) if (!free(i, j)) fits = false
        if (!fits) continue
        const m = o.margin ?? 0
        for (let j = y - m; j < y + h + m && fits; j++) for (let i = x - m; i < x + w + m && fits; i++) if (B.inside(i, j) && B.taken[idx(i, j)]) fits = false
        if (!fits) continue
        const dx = x + Math.floor(w / 2)
        const dy = y + h
        const dt = B.get(dx, dy)
        if (!B.inside(dx, dy) || B.isTaken(dx, dy) || isWet(dt) || !(ground.has(dt) || STREETS.has(dt))) continue
        if (reserved[idx(dx, dy)] && !STREETS.has(dt)) continue
        // The door needs open ground in front of it; whether that ground still connects to the
        // streets once the block fills up is checked afterwards (prune).
        if (o.nearStreet && !(STREETS.has(dt) || N4.some(([ax, ay]) => STREETS.has(B.get(dx + ax, dy + ay))))) continue
        placed = { w, h }
      }
    if (!placed) continue
    const { w, h } = placed
    const b = B.building({
      id: `${o.prefix}${x}_${y}`,
      kind: lot.kind,
      variant: lot.variant,
      name: lot.name,
      x,
      y,
      w,
      h,
      doorX: x + Math.floor(w / 2),
      text: lot.text,
      style: Math.floor(hash(x, y, 7) * 4),
      litHours: lot.home ? [[17 * 60 + Math.floor(r() * 90), 21 * 60 + Math.floor(r() * 150)]] : lot.kind === 'teahouse' || lot.kind === 'tavern' || lot.kind === 'inn' ? [[17 * 60, 24 * 60]] : undefined,
    })
    for (let i = -1; i <= 1; i++) if (B.inside(b.door.x + i, b.door.y)) reserved[idx(b.door.x + i, b.door.y)] = 1
    out.push(b)
    const g = o.group(x, y)
    if (lot.home) B.home(g, b)
    if (lot.kind === 'inn') B.home('guests', b)
    sinceSpot += w
    if (sinceSpot >= (o.spotEvery ?? 16)) {
      sinceSpot = 0
      B.spot(g, `spot:${b.id}`, b.door.x, b.door.y, 'down')
    }
  }
  return out
}

/** Tiles reachable on foot from `from` (no swimming, no climbing over things). */
export function reachable(B: Builder, from: Pt): Uint8Array {
  const seen = new Uint8Array(B.w * B.h)
  const q = [idx(from.x, from.y)]
  seen[q[0]] = 1
  for (let h = 0; h < q.length; h++) {
    const i = q[h]
    const x = i % B.w
    const y = (i / B.w) | 0
    for (const [dx, dy] of N4) {
      const nx = x + dx
      const ny = y + dy
      if (!B.inside(nx, ny)) continue
      const j = idx(nx, ny)
      if (seen[j] || B.taken[j] || isWet(B.tiles[j]) || B.tiles[j] === T.Forest || B.tiles[j] === T.Cliff) continue
      seen[j] = 1
      q.push(j)
    }
  }
  return seen
}

/** Take out generated houses whose door can't be reached from `hub`. Returns how many went. */
export function prune(B: Builder, hub: Pt): number {
  const seen = reachable(B, hub)
  const gone = B.buildings.filter((b) => b.style !== undefined && !seen[idx(b.door.x, b.door.y)])
  for (const b of gone) {
    B.buildings.splice(B.buildings.indexOf(b), 1)
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) B.taken[idx(x, y)] = 0
    delete B.places[`door:${b.id}`]
    delete B.places[`spot:${b.id}`]
    for (const list of [...Object.values(B.homes), ...Object.values(B.spots)]) {
      for (let k = list.length - 1; k >= 0; k--) if (list[k] === `door:${b.id}` || list[k] === `spot:${b.id}`) list.splice(k, 1)
    }
  }
  return gone.length
}

// ---------------------------------------------------------------------------------------------
// Courtyards and yards
// ---------------------------------------------------------------------------------------------

/**
 * Fill leftover ground: shut-in courtyards get gardens (trees, wells), and dead-end nooks off the
 * streets get the odd barrel, woodpile or washing line. Nothing that could cut a path is touched.
 */
export function yards(B: Builder, r: Rng, hub: Pt, reserved: Uint8Array, o: { ok: (x: number, y: number) => boolean; ground: number[]; trees: TreeKind[]; garden?: number; nook?: number }): void {
  const ground = new Set(o.ground)
  const seen = reachable(B, hub)
  const placeAt = new Set(Object.values(B.places).map((p) => idx(p.x, p.y)))
  const walk = (x: number, y: number) => B.inside(x, y) && seen[idx(x, y)] === 1
  for (let y = 1; y < B.h - 1; y++)
    for (let x = 1; x < B.w - 1; x++) {
      const i = idx(x, y)
      if (!o.ok(x, y) || !ground.has(B.tiles[i]) || B.taken[i] || reserved[i] || placeAt.has(i)) continue
      if (!seen[i]) {
        // An enclosed courtyard.
        const v = r()
        if (v < (o.garden ?? 0.4)) B.prop({ kind: 'tree', x, y, variant: pick(r, o.trees), solid: true })
        else if (v < (o.garden ?? 0.4) + 0.06) B.prop({ kind: 'hydrangea', x, y, solid: true, name: 'Hydrangea', text: 'Hydrangeas in a courtyard nobody can get to. They are doing very well without us.' })
        continue
      }
      const open = N4.filter(([dx, dy]) => walk(x + dx, y + dy)).length
      if (open !== 1 || r() > (o.nook ?? 0.25)) continue
      const v = r()
      if (v < 0.3) B.prop({ kind: 'tree', x, y, variant: pick(r, o.trees), solid: true })
      else if (v < 0.5) B.prop({ kind: 'casks', x, y, variant: 'one', solid: true, name: 'Barrel', text: 'A rain barrel. A frog lives in it and considers it a lake.' })
      else if (v < 0.65) B.prop({ kind: 'firewood', x, y, solid: true, name: 'Firewood', text: 'Firewood, stacked for winter by someone with opinions about stacking.' })
      else if (v < 0.78) B.prop({ kind: 'well', x, y, solid: true, name: 'Well', text: 'A neighbourhood well. Somebody dropped a sandal in it. Left foot.' })
      else if (v < 0.9) B.prop({ kind: 'laundry', x, y, solid: true, name: 'Laundry', text: 'Someone’s laundry. A loincloth, a kimono, and a very small kimono.' })
      else B.prop({ kind: 'crates', x, y, solid: true, name: 'Crates', text: 'Crates of something. One of them is labelled "NOT SAKE". It is sake.' })
      seen[i] = 0
    }
}
