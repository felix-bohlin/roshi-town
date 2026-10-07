// The organic settlement generator: how Kumoi and the villages around the bay are grown.
//
//   1. bridges and gates are laid where the plan says (bridge, gate)
//   2. walls follow the real coastline, with towers every so often (coastWalls); harbours get quays
//      and piers instead (docks)
//   3. streets are carved by a path search over noise between gates, plazas, named buildings and
//      scattered points, so they wind, merge and branch like streets that grew (streets)
//   4. houses are packed in wherever their door can reach a street (lots); any whose door ends up
//      cut off is taken out again (prune)
//   5. what's left over becomes courtyards and yards: trees, wells, laundry (yards)
//
// Buildings are drawn front-on with the door at the bottom, so a lot only needs a street (or the
// tile in front of its door) below it; streets may run any way.

import { astar } from '../engine/path'
import { hash, noise, pick, type Rng } from '../engine/rng'
import { idx, isWet, T, type Builder, type Building, type Pt, type TreeKind } from './layout'
import type { Lot } from './plan'
import { rect } from './plan'
import type { Dir } from './layout'

const STREETS = new Set<number>([T.Road, T.Stone, T.Gravel, T.Bridge, T.Pier])
/** House kinds that look fine a little narrower or lower than asked. */
const FLEX = new Set<string>(['machiya', 'nagaya', 'minka', 'minkaOld', 'cottage', 'kura'])
export const isStreet = (t: number) => STREETS.has(t)

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
 * A town gate where a bridge lands on a walled coast. `land` is the first land tile off the bridge
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

// ---------------------------------------------------------------------------------------------
// Walls and docks
// ---------------------------------------------------------------------------------------------

const SEAISH = (t: number) => t === T.Sea || t === T.Moat
const N4: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** Walls along every walled coast tile facing the sea, with a tower every `every` tiles or so. */
export function coastWalls(B: Builder, walled: (x: number, y: number) => boolean, skip: (x: number, y: number) => boolean, every = 16): void {
  const coast: Pt[] = []
  for (let y = 1; y < B.h - 1; y++)
    for (let x = 1; x < B.w - 1; x++) {
      // Only open town ground gets a wall (gate passages and quays are paved).
      if (!walled(x, y) || B.get(x, y) !== T.Plaza || skip(x, y)) continue
      if (N4.some(([dx, dy]) => SEAISH(B.get(x + dx, y + dy)))) coast.push({ x, y })
    }
  const towers: Pt[] = []
  let n = 0
  for (const c of coast) {
    if (towers.some((t) => Math.abs(t.x - c.x) + Math.abs(t.y - c.y) < every)) continue
    const x0 = c.x - 1
    const y0 = c.y - 1
    let ok = true
    for (let y = y0; y < y0 + 3 && ok; y++) for (let x = x0; x < x0 + 3 && ok; x++) if (!walled(x, y) || isWet(B.get(x, y)) || B.isTaken(x, y) || B.get(x, y) === T.Bridge) ok = false
    if (!ok) continue
    towers.push(c)
    B.building({ id: `tower${++n}`, kind: 'tower', name: 'Wall tower', x: x0, y: y0, w: 3, h: 3, door: { x: c.x, y: y0 + 3 }, text: 'A tower on the town wall. An archer up there is watching the sea. Mostly he is watching the fish market.', litHours: [[1110, 1350]] })
  }
  const text = 'The town wall: river stones below, white plaster above, clay tiles on top. Turtles: not allowed over.'
  for (const c of coast) if (!B.isTaken(c.x, c.y)) B.prop({ kind: 'wall', x: c.x, y: c.y, solid: true, name: 'Town wall', text })
}

/**
 * Harbour fronts: coast tiles in the dock zone become a stone quay, and piers run out into the sea
 * every so often, some with a boat tied up.
 */
export function docks(B: Builder, r: Rng, inDock: (x: number, y: number) => boolean, o: { every?: number; maxLen?: number; boats?: number } = {}): Pt[] {
  const quay: { x: number; y: number; d: [number, number] }[] = []
  for (let y = 1; y < B.h - 1; y++)
    for (let x = 1; x < B.w - 1; x++) {
      if (!inDock(x, y) || isWet(B.get(x, y)) || B.isTaken(x, y) || B.get(x, y) === T.Bridge) continue
      const d = N4.find(([dx, dy]) => B.get(x + dx, y + dy) === T.Sea)
      if (!d) continue
      B.set(x, y, T.Stone)
      quay.push({ x, y, d })
    }
  const roots: Pt[] = []
  const every = o.every ?? 9
  for (const q of quay) {
    if (roots.some((p) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) < every)) continue
    const [dx, dy] = q.d
    const len = 4 + Math.floor(r() * ((o.maxLen ?? 9) - 3))
    // Stop short of the far shore.
    let k = 1
    while (k <= len && B.get(q.x + dx * k, q.y + dy * k) === T.Sea && B.get(q.x + dx * (k + 2), q.y + dy * (k + 2)) === T.Sea) k++
    if (k < 4) continue
    roots.push(q)
    const px = dy !== 0 ? 1 : 0
    const py = dx !== 0 ? 1 : 0
    for (let s = 1; s < k; s++) {
      B.set(q.x + dx * s, q.y + dy * s, T.Pier)
      if (B.get(q.x + dx * s + px, q.y + dy * s + py) === T.Sea) B.set(q.x + dx * s + px, q.y + dy * s + py, T.Pier)
    }
    if (r() < (o.boats ?? 0.6)) {
      const bx = q.x + dx * (k - 2) - px * 2
      const by = q.y + dy * (k - 2) - py * 2
      if (B.get(bx, by) === T.Sea && !B.isTaken(bx, by)) B.prop({ kind: 'boat', x: bx, y: by, solid: true, name: 'Fishing boat', text: pick(r, BOAT_TEXT) })
    }
  }
  return roots
}

const BOAT_TEXT = [
  'A fishing boat, rocking gently. It smells of fish and very old decisions.',
  'A boat with an eye painted on the bow, so it can see where it’s going. It’s going nowhere. It’s tied up.',
  'A little boat full of nets and one sleeping cat.',
]

// ---------------------------------------------------------------------------------------------
// Streets
// ---------------------------------------------------------------------------------------------

export interface Waypoint extends Pt {
  /** Street width carved towards this point. */
  w: number
}

/**
 * Carve a street network joining `points` (the first is the hub), staying on tiles where `ok` is
 * true. Each point is joined to the nearest already-joined one by a path over noise (streets wind)
 * that prefers existing streets (streets merge). `loops` extra links close some blocks.
 */
export function streets(B: Builder, r: Rng, ok: (i: number) => boolean, points: Waypoint[], o: { seed: number; loops: number; ground: number[]; coast: Int16Array; road?: number }): void {
  const W = B.w
  const ground = new Set(o.ground)
  const road = (o.road ?? T.Road) as never
  const cost = (i: number) => {
    const t = B.tiles[i]
    if (t === T.Bridge || t === T.Pier) return 1
    if (!ok(i) || B.taken[i] || isWet(t)) return Infinity
    if (STREETS.has(t)) return 0.45
    if (!ground.has(t)) return Infinity
    const x = i % W
    const y = (i / W) | 0
    return 1 + noise(x / 9, y / 9, o.seed) * 3.5 + noise(x / 3, y / 3, o.seed + 3) * 0.8 + (o.coast[i] <= 1 ? 8 : o.coast[i] === 2 ? 2 : 0)
  }
  const paint = (path: number[], w: number) => {
    const lo = -Math.floor((w - 1) / 2)
    for (const i of path) {
      const x = i % W
      const y = (i / W) | 0
      for (let dy = lo; dy < lo + w; dy++)
        for (let dx = lo; dx < lo + w; dx++) {
          const j = idx(x + dx, y + dy)
          if (!B.inside(x + dx, y + dy) || !ok(j) || B.taken[j] || !ground.has(B.tiles[j])) continue
          B.tiles[j] = road
        }
    }
  }
  const joined: Waypoint[] = [points[0]]
  const rest = points.slice(1)
  const d2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2
  while (rest.length) {
    // The waiting point nearest to the joined network goes next.
    let bi = 0
    let bd = Infinity
    let bq = joined[0]
    for (let k = 0; k < rest.length; k++)
      for (const q of joined) {
        const d = d2(rest[k], q)
        if (d < bd) [bi, bd, bq] = [k, d, q]
      }
    const p = rest.splice(bi, 1)[0]
    const path = astar(W, B.h, cost, idx(p.x, p.y), idx(bq.x, bq.y), 400000)
    if (path) paint([idx(p.x, p.y), ...path], Math.max(p.w, Math.min(bq.w, p.w + 1)))
    joined.push(p)
  }
  for (let k = 0; k < o.loops; k++) {
    const a = pick(r, points)
    const near = points.filter((b) => b !== a && d2(a, b) > 12 ** 2 && d2(a, b) < 40 ** 2)
    if (!near.length) continue
    const b = pick(r, near)
    const path = astar(W, B.h, cost, idx(a.x, a.y), idx(b.x, b.y), 200000)
    if (path) paint(path, 1 + (r() < 0.3 ? 1 : 0))
  }
}

/** Points spread over the tiles where `ok` holds, roughly `spacing` apart (for street coverage). */
export function scatterPoints(B: Builder, r: Rng, ok: (x: number, y: number) => boolean, spacing: number, w = 1): Waypoint[] {
  const out: Waypoint[] = []
  for (let y = 0; y < B.h; y += spacing)
    for (let x = 0; x < B.w; x += spacing) {
      const px = x + Math.floor(r() * spacing)
      const py = y + Math.floor(r() * spacing)
      if (B.inside(px, py) && ok(px, py) && !B.isTaken(px, py)) out.push({ x: px, y: py, w })
    }
  return out
}

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
