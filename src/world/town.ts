// Kumoi and the country around it, Ise Province, 1582 — the whole map, 400×320 tiles of 16 px.
//
//   the bay      Kumoi on its islands round the harbour basin (world/kumoi.ts)
//   north-east   woods, a bamboo grove, the mountain with Kōun-ji and its temple village
//                (world/mountain.ts, placed 180 tiles east of where it was planned)
//   east         the river, the old shrine in the woods, the village of Okitsu on the east road
//   south        the farming village of Inaba and the refugee camp, the fishing village of Hamana
//   west         open sea, and Roshi's island (world/villages.ts)

import { rng } from '../engine/rng'
import { kumoi } from './kumoi'
import { Builder, idx, shifted, T, type TreeKind, type World } from './layout'
import { mountain } from './mountain'
import { ISLAND, mainland, RIVER, villages } from './villages'

/** Where the mountain (planned at x 100–186) sits on the map. */
const MOUNTAIN_DX = 180

export function buildWorld(): World {
  const B = new Builder()
  B.fill(0, 0, B.w, B.h, T.Sea)
  mainland(B)
  const city = kumoi(B)
  mountain(shifted(B, MOUNTAIN_DX, 0))
  const country = villages(B)
  districts(B)
  nature(B, (i) => city.zone[i] > 0 || country.zone[i] > 0)
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
  }
}

function districts(B: Builder): void {
  const M = MOUNTAIN_DX
  // Earlier entries win where they overlap.
  B.district("Roshi's Island", ISLAND.x - 14, ISLAND.y - 9, 30, 17)
  B.district('Kōun-ji Temple', 100 + M, 0, 85, 19)
  B.district('The Torii Tunnel', 106 + M, 37, 12, 15)
  B.district('Halfway Teahouse', 164 + M, 26, 21, 11)
  B.district('The Waterfall', 120 + M, 24, 14, 13)
  B.district('The Six Jizō', 106 + M, 51, 42, 5)
  B.district('The Thousand Steps', 100 + M, 19, 90, 47)
  B.district('Temple Village', 98 + M, 63, 90, 17)
  B.district('Kumoi Castle', 132, 14, 35, 30)
  B.district('Town Square', 138, 128, 40, 24)
  B.district('Willow Canal', 110, 186, 116, 14)
  B.district('Samurai Quarter', 50, 8, 90, 66)
  B.district('The Causeway', 126, 56, 36, 26)
  B.district('Harbour Arm', 18, 158, 50, 92)
  B.district('Craftsmen’s Quarter', 100, 198, 120, 66)
  B.district('Shiomachi', 194, 140, 96, 120)
  B.district('Merchant Quarter', 64, 66, 120, 120)
  B.district('Kumoi', 180, 66, 80, 125)
  B.district('Inaba', 20, 276, 70, 44)
  B.district('Refugee Camp', 76, 274, 18, 24)
  B.district('Rice Terraces', 0, 270, 30, 50)
  B.district('Hamana', 155, 268, 75, 30)
  B.district('Okitsu', 312, 186, 70, 56)
  B.district('Old Kumoi Shrine', 362, 144, 22, 22)
  B.district('The River', 290, 0, 110, 145)
  B.district('Bamboo Grove', 200, 0, 45, 60)
  B.district('The Mountain', 240, 0, 160, 66)
  B.district('Northern Woods', 200, 0, 200, 112)
  B.district('Eastern Woods', 296, 110, 104, 210)
  B.district('South Shore', 0, 260, 300, 60)
  B.district('Ise Bay', 0, 0, 400, 320)
}

function nature(B: Builder, settled: (i: number) => boolean): void {
  const r = rng(1582)
  const W = B.w
  const H = B.h
  // Keep scatter off roads, doors, places, villages and the city.
  const blocked = new Uint8Array(W * H)
  const block = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (B.inside(i, j)) blocked[idx(i, j)] = 1
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y)
      const t = B.tiles[i]
      if (settled(i)) blocked[i] = 1
      if (B.taken[i]) block(x - 1, y - 1, 3, 3)
      if (t !== T.Grass && t !== T.Forest && t !== T.Sand) block(x, y)
      if (t === T.Road || t === T.Plaza || t === T.Stone || t === T.Bridge || t === T.Gravel || t === T.Stairs || t === T.Pier) block(x - 1, y - 1, 3, 3)
    }
  for (const b of B.buildings) block(b.door.x - 1, b.door.y, 3, 2)
  for (const p of Object.values(B.places)) block(p.x - 1, p.y - 1, 3, 3)
  for (const a of Object.values(B.areas)) if (!a.only || a.only.includes(T.Grass)) block(a.x, a.y, a.w, a.h)
  block(MOUNTAIN_DX + 98, 63, 90, 17)

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
  // Bamboo grove north of the city, woods round the mountain and in the east.
  for (let y = 2; y <= 58; y++)
    for (let x = 200; x <= 244; x++) {
      if (!B.inside(x, y) || blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      if (r() < 0.42) {
        B.prop({ kind: 'bamboo', x, y, solid: true })
        blocked[idx(x, y)] = 1
      }
    }
  zone(200, 58, 300, 110, 0.26, ['broad', 'maple', 'pine', 'cedar'])
  zone(366, 0, 398, 110, 0.3, ['cedar', 'broad', 'maple'])
  zone(296, 110, 398, 318, 0.2, ['broad', 'broad', 'maple', 'cedar', 'pine'])
  zone(2, 266, 296, 318, 0.04, ['broad', 'persimmon', 'pine', 'maple'])
  zone(0, 255, 300, 320, 0.08, ['blackpine'], [T.Sand])
  zone(296, 100, 400, 320, 0.05, ['blackpine'], [T.Sand])
  // Trees on the mountain's forest tiles (decoration: the forest itself blocks movement).
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (B.get(x, y) !== T.Forest) continue
      const nearPath = [-1, 0, 1].some((d) => {
        const a = B.get(x, y + d)
        const b = B.get(x + d, y)
        return a === T.Road || b === T.Road || a === T.Stairs || b === T.Stairs
      })
      if (nearPath || r() > 0.5) continue
      const onMountain = y < 63 && x >= 240
      const v: TreeKind = onMountain ? (r() < 0.55 ? 'cedar' : r() < 0.5 ? 'maple' : 'pine') : r() < 0.5 ? 'broad' : 'pine'
      B.prop({ kind: 'tree', x, y, variant: v, solid: false })
    }
  // Bushes, rocks and wild hydrangeas on leftover grass.
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      if (blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      const v = r()
      if (v < 0.02) {
        B.prop({ kind: 'bush', x, y, solid: true, name: 'Bush', text: 'A bush. It rustles. Probably a ninja. Probably a sparrow.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.028) {
        B.prop({ kind: 'rock', x, y, solid: true, name: 'Rock', text: 'A mossy rock. You feel a certain kinship.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.036) {
        B.prop({ kind: 'hydrangea', x, y, solid: true, name: 'Hydrangea', text: 'Wild hydrangeas, blue and violet. The rainy season’s one good idea.' })
        block(x - 1, y - 1, 3, 3)
      }
    }
  // Reeds along the river; irises by the temple pond.
  for (let k = 0; k + 1 < RIVER.length; k++) {
    const [ax, ay] = RIVER[k]
    const [bx, by] = RIVER[k + 1]
    for (let s = 0; s < 1; s += 0.02) {
      const x = Math.round(ax + (bx - ax) * s)
      const y = Math.round(ay + (by - ay) * s)
      for (const dx of [-3, 3]) if (B.get(x + dx, y) === T.Grass && !B.isTaken(x + dx, y) && r() < 0.35) B.prop({ kind: 'reeds', x: x + dx, y, solid: false })
    }
  }
  for (let y = 2; y <= 10; y++)
    for (let x = 100 + MOUNTAIN_DX; x <= 115 + MOUNTAIN_DX; x++) {
      if (B.get(x, y) !== T.Grass || B.isTaken(x, y)) continue
      const wet = [B.get(x + 1, y), B.get(x - 1, y), B.get(x, y + 1), B.get(x, y - 1)].includes(T.Water)
      if (wet && r() < 0.5) B.prop({ kind: 'iris', x, y, solid: false })
    }
}
