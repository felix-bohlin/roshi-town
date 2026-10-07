// The Kumoi valley, Ise Province, 1582 — the whole map, 240×200 tiles of 16 px.
//
//   north        the mountain with Kōun-ji and the temple village at its foot (world/mountain.ts)
//   north-west   the lord's manor in its moat, and the samurai lane
//   middle       Kumoi, the market village round its square
//   west         Inaba's farms and paddies, the refugee camp
//   east         the river, Okitsu on the far bank, the woods and the old shrine
//   south        Hamana harbour on the shore, the beach, the bay and Roshi's island
//
// The villages themselves are world/valley.ts.

import { rng } from '../engine/rng'
import { Builder, idx, shifted, T, type TreeKind, type World } from './layout'
import { mountain } from './mountain'
import { areas, districts, gardens, hamana, houses, inaba, island, ISLAND, kumoi, land, manor, MOUNTAIN_DX, okitsu, RIVER, roads, settledMask } from './valley'

export function buildWorld(): World {
  const B = new Builder()
  const flow = new Uint8Array(B.w * B.h)
  land(B, flow)
  mountain(shifted(B, MOUNTAIN_DX, 0))
  // The mountain stream down to the waterfall pool.
  for (let y = 25; y < 31; y++) for (let x = 126; x < 128; x++) flow[idx(x + MOUNTAIN_DX, y)] = 1
  roads(B)
  kumoi(B)
  manor(B)
  hamana(B)
  inaba(B)
  okitsu(B)
  island(B)
  const hub = B.places.teaCounter
  const r = rng(1600)
  houses(B, r, hub)
  gardens(B, r, hub)
  areas(B)
  districts(B)
  nature(B, settledMask(B))
  return {
    w: B.w,
    h: B.h,
    tiles: B.tiles,
    crops: B.crops,
    planted: B.planted,
    buildings: B.buildings,
    props: B.props,
    places: B.places,
    areas: B.areas,
    districts: B.districts,
    start: { x: ISLAND.x + 2, y: ISLAND.y + 3 },
    spots: B.spots,
    homes: B.homes,
    flow,
  }
}

function nature(B: Builder, settled: Uint8Array): void {
  const r = rng(1582)
  const W = B.w
  const H = B.h
  // Keep scatter off roads, doors, places and the villages.
  const blocked = new Uint8Array(W * H)
  const block = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (B.inside(i, j)) blocked[idx(i, j)] = 1
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y)
      const t = B.tiles[i]
      if (settled[i]) blocked[i] = 1
      if (B.taken[i]) block(x - 1, y - 1, 3, 3)
      if (t !== T.Grass && t !== T.Forest && t !== T.Sand) block(x, y)
      if (t === T.Road || t === T.Plaza || t === T.Stone || t === T.Bridge || t === T.Gravel || t === T.Stairs || t === T.Pier) block(x - 2, y - 2, 5, 5)
    }
  for (const b of B.buildings) block(b.door.x - 1, b.door.y, 3, 2)
  for (const p of Object.values(B.places)) block(p.x - 1, p.y - 1, 3, 3)
  for (const a of Object.values(B.areas)) if (!a.only || a.only.includes(T.Grass)) block(a.x, a.y, a.w, a.h)
  block(98 + MOUNTAIN_DX, 63, 90, 17)

  const zone = (x0: number, y0: number, x1: number, y1: number, density: number, kinds: TreeKind[], ground: number[] = [T.Grass]) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (!B.inside(x, y) || blocked[idx(x, y)] || !ground.includes(B.get(x, y))) continue
        if (r() < density) {
          B.prop({ kind: 'tree', x, y, variant: kinds[Math.floor(r() * kinds.length)], solid: true })
          blocked[idx(x, y)] = 1
        }
      }
  }
  // The woods east of the river, a bamboo grove under the mountain, copses in the meadows.
  zone(196, 0, 239, 90, 0.24, ['broad', 'maple', 'cedar', 'pine'])
  zone(196, 136, 239, 168, 0.12, ['broad', 'maple', 'pine'])
  for (let y = 64; y <= 86; y++)
    for (let x = 168; x <= 190; x++) {
      if (!B.inside(x, y) || blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      if (r() < 0.38) {
        B.prop({ kind: 'bamboo', x, y, solid: true })
        blocked[idx(x, y)] = 1
      }
    }
  zone(46, 62, 110, 80, 0.07, ['broad', 'maple', 'pine'])
  zone(0, 90, 239, 160, 0.025, ['broad', 'persimmon', 'pine', 'maple'])
  zone(0, 140, 239, 199, 0.07, ['blackpine'], [T.Sand])
  // Trees on the forest tiles (decoration: the forest itself blocks movement).
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (B.get(x, y) !== T.Forest) continue
      const nearPath = [-1, 0, 1].some((d) => {
        const a = B.get(x, y + d)
        const b = B.get(x + d, y)
        return a === T.Road || b === T.Road || a === T.Stairs || b === T.Stairs
      })
      if (nearPath || r() > 0.5) continue
      const onMountain = y < 63 && x >= 40 && x < 212
      const v: TreeKind = onMountain ? (r() < 0.55 ? 'cedar' : r() < 0.5 ? 'maple' : 'pine') : r() < 0.5 ? 'broad' : 'pine'
      B.prop({ kind: 'tree', x, y, variant: v, solid: false })
    }
  // Bushes, rocks and wild hydrangeas on leftover grass.
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      if (blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      const v = r()
      if (v < 0.018) {
        B.prop({ kind: 'bush', x, y, solid: true, name: 'Bush', text: 'A bush. It rustles. Probably a ninja. Probably a sparrow.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.024) {
        B.prop({ kind: 'rock', x, y, solid: true, name: 'Rock', text: 'A mossy rock. You feel a certain kinship.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.034) {
        B.prop({ kind: 'hydrangea', x, y, solid: true, name: 'Hydrangea', text: 'Wild hydrangeas, blue and violet. The rainy season’s one good idea.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.05) {
        B.prop({ kind: 'flowers', x, y, variant: 'wild', solid: false, name: 'Wildflowers', text: 'Wildflowers. Nobody planted them; nobody would dare pull them up.' })
      }
    }
  // Reeds along the river; irises by the temple pond.
  for (let k = 0; k + 1 < RIVER.length; k++) {
    const [ax, ay] = RIVER[k]
    const [bx, by] = RIVER[k + 1]
    for (let s = 0; s < 1; s += 0.02) {
      const x = Math.round(ax + (bx - ax) * s)
      const y = Math.round(ay + (by - ay) * s)
      for (const dx of [-3, 3]) if (B.get(x + dx, y) === T.Grass && !B.isTaken(x + dx, y) && !blocked[idx(x + dx, y)] && r() < 0.35) B.prop({ kind: 'reeds', x: x + dx, y, solid: false })
    }
  }
  for (let y = 2; y <= 10; y++)
    for (let x = 100 + MOUNTAIN_DX; x <= 115 + MOUNTAIN_DX; x++) {
      if (B.get(x, y) !== T.Grass || B.isTaken(x, y)) continue
      const wet = [B.get(x + 1, y), B.get(x - 1, y), B.get(x, y + 1), B.get(x, y - 1)].includes(T.Water)
      if (wet && r() < 0.5) B.prop({ kind: 'iris', x, y, solid: false })
    }
}
