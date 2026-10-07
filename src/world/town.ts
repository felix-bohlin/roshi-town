// Kumoi, a port city in Ise Province, 1582 — the town plan, 288×224 tiles of 16 px.
//
//   north    the mountain, with Kōun-ji on its summit and the long climb up (world/mountain.ts)
//   centre   the walled city in its moat: avenue, main street, square, castle, quarters (world/city.ts)
//   south    the harbour and the bay (world/harbour.ts)
//   west     rice terraces, farms, the refugee camp, the fishing village (world/outskirts.ts)
//   east     the river, the woods and the old shrine, the east beach, Roshi's island

import { rng } from '../engine/rng'
import { city } from './city'
import { harbour } from './harbour'
import { Builder, idx, T, type TreeKind, type World } from './layout'
import { mountain } from './mountain'
import { ISLAND, outskirts, riverX } from './outskirts'
import { AVE_X, MAIN_Y, QUAY_SEA, WX0, WX1, WY0, WY1 } from './plan'

export function buildWorld(): World {
  const B = new Builder()
  terrain(B)
  mountain(B)
  city(B)
  harbour(B)
  outskirts(B)
  districts(B)
  nature(B)
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

/** First sea row per column. */
function coastY(x: number): number {
  if (x >= 36 && x <= 240) return QUAY_SEA
  return 196 + Math.round(1.5 * Math.sin(x / 7) + 0.8 * Math.sin(x / 2.9 + 1))
}

function terrain(B: Builder): void {
  // Forest along the map edges.
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (y <= 1 || x <= 1 || x >= B.w - 2) B.set(x, y, T.Forest)
  // The sea, and beaches west and east of the harbour.
  for (let x = 0; x < B.w; x++) {
    const c = coastY(x)
    for (let y = c; y < B.h; y++) B.set(x, y, T.Sea)
    if (x < 36) for (let y = 176 + Math.round(Math.sin(x / 4) * 1.5); y < c; y++) B.set(x, y, T.Sand)
    if (x > 240) for (let y = 178 + Math.round(Math.sin(x / 3) * 1.5); y < c; y++) B.set(x, y, T.Sand)
  }
  // The river comes down out of the eastern woods into the sea.
  for (let y = 0; y < B.h; y++) {
    const c = riverX(y)
    for (let dx = -1; dx <= 1; dx++) if (B.get(c + dx, y) !== T.Sea) B.set(c + dx, y, T.Water)
  }
  // Moat ring, with the city (and a grass berm) inside.
  B.fill(WX0 - 4, WY0 - 4, WX1 - WX0 + 9, WY1 - WY0 + 9, T.Moat)
  B.fill(WX0 - 1, WY0 - 1, WX1 - WX0 + 3, WY1 - WY0 + 3, T.Grass)
  // Roads in and out: west to Sakai, east to Okazaki (over the river).
  B.fill(0, MAIN_Y + 1, WX0 - 4, 2, T.Road)
  B.fill(WX1 + 5, MAIN_Y + 1, B.w - WX1 - 5, 2, T.Road)
  // Bridges over the moat.
  B.fill(AVE_X, WY0 - 4, 4, 3, T.Bridge)
  B.fill(AVE_X, WY1 + 2, 4, 3, T.Bridge)
  B.fill(WX0 - 4, MAIN_Y + 1, 3, 2, T.Bridge)
  B.fill(WX1 + 2, MAIN_Y + 1, 3, 2, T.Bridge)
  for (let x = riverX(MAIN_Y + 1) - 2; x <= riverX(MAIN_Y + 2) + 2; x++) for (const y of [MAIN_Y + 1, MAIN_Y + 2]) if (B.get(x, y) === T.Water) B.set(x, y, T.Bridge)
  B.area('moatSouth', WX0 - 4, WY1 + 2, WX1 - WX0 + 9, 3, [T.Moat])
  B.area('moatNorth', WX0 - 4, WY0 - 4, WX1 - WX0 + 9, 3, [T.Moat])
}

function districts(B: Builder): void {
  // Earlier entries win where they overlap.
  B.district("Roshi's Island", ISLAND.x - 16, ISLAND.y - 10, 32, 18)
  B.district('North Gate', AVE_X - 4, WY0 - 5, 12, 9)
  B.district('Sea Gate', AVE_X - 4, WY1 - 3, 12, 10)
  B.district('West Gate', WX0 - 5, MAIN_Y - 3, 9, 9)
  B.district('East Gate', WX1 - 3, MAIN_Y - 3, 9, 9)
  B.district('Refugee Camp', 32, 100, 12, 23)
  B.district('Kōun-ji Temple', 100, 0, 85, 19)
  B.district('The Torii Tunnel', 106, 37, 12, 15)
  B.district('Halfway Teahouse', 164, 26, 21, 11)
  B.district('The Waterfall', 120, 24, 14, 13)
  B.district('The Six Jizō', 106, 51, 42, 5)
  B.district('The Thousand Steps', 100, 19, 90, 47)
  B.district('Temple Town', 98, 66, 90, 13)
  B.district('Kumoi Castle', 186, WY0, WX1 - 186, 40)
  B.district('Town Square', 118, 102, 49, 22)
  B.district('Inari Shrine', 167, 102, 18, 8)
  B.district('Samurai Quarter', WX0, WY0, 70, 17)
  B.district('Shop Row', 118, WY0, 68, 18)
  B.district('Merchant Quarter', WX0, 101, 70, 23)
  B.district('Main Street', WX0, MAIN_Y, WX1 - WX0, 4)
  B.district('Jōshō-ji', 96, 148, 21, 18)
  B.district('Craftsmen’s Quarter', WX0, 128, 92, 41)
  B.district('Willow Canal', 144, 143, WX1 - 144, 12)
  B.district('Inn & Brewery Street', 144, 128, WX1 - 144, 15)
  B.district('Lower Town', 144, 155, WX1 - 144, 14)
  B.district('Grand Avenue', AVE_X, WY0, 4, WY1 - WY0)
  B.district('Fish Market', 58, 173, 16, 12)
  B.district('The Lighthouse', 222, QUAY_SEA, 10, 20)
  B.district('Harbour', 30, 173, 212, 32)
  B.district('Fishing Village', 0, 176, 36, 24)
  B.district('Old Kumoi Shrine', 262, 94, 16, 16)
  B.district('Rice Terraces', 0, 60, 44, 70)
  B.district('Farms', 0, 128, 44, 48)
  B.district('East Beach', 241, 176, 47, 22)
  B.district('The River', riverX(120) - 5, 0, 11, 196)
  B.district('Eastern Woods', 232, 0, 56, 176)
  B.district('Bamboo Grove', 0, 0, 60, 60)
  B.district('The Mountain', 60, 0, 172, 66)
  B.district('The Moat', WX0 - 5, WY0 - 5, WX1 - WX0 + 11, WY1 - WY0 + 11)
}

function nature(B: Builder): void {
  const r = rng(1582)
  const W = B.w
  const H = B.h
  // Keep scatter off roads, doors and the verges.
  const blocked = new Uint8Array(W * H)
  const block = (x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (B.inside(i, j)) blocked[idx(i, j)] = 1
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = B.get(x, y)
      if (B.taken[idx(x, y)]) block(x - 1, y - 1, 3, 3)
      if (t !== T.Grass && t !== T.Forest && t !== T.Sand) block(x, y)
      if (t === T.Road || t === T.Plaza || t === T.Stone || t === T.Bridge || t === T.Gravel || t === T.Stairs) block(x - 1, y - 1, 3, 3)
    }
  for (const b of B.buildings) block(b.door.x - 1, b.door.y, 3, 2)
  for (const p of Object.values(B.places)) block(p.x - 1, p.y - 1, 3, 3)
  for (const a of Object.values(B.areas)) if (!a.only || a.only.includes(T.Grass)) block(a.x, a.y, a.w, a.h)
  // Inside the city walls only the gardens (world/city.ts).
  block(WX0, WY0, WX1 - WX0 + 1, WY1 - WY0 + 1)
  // The approach between the shops and the mountain foot stays open.
  block(AVE_X - 2, 63, 8, 17)

  const tree = (x: number, y: number, v: TreeKind) => {
    B.prop({ kind: 'tree', x, y, variant: v, solid: true })
    block(x, y)
  }
  const zone = (x0: number, y0: number, x1: number, y1: number, density: number, kinds: TreeKind[], ground: number[] = [T.Grass]) => {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (blocked[idx(x, y)] || !ground.includes(B.get(x, y))) continue
        if (r() < density) tree(x, y, kinds[Math.floor(r() * kinds.length)])
      }
  }
  // Bamboo grove in the north-west.
  for (let y = 2; y <= 58; y++)
    for (let x = 2; x <= 58; x++) {
      if (blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      if (r() < (x < 40 ? 0.5 : 0.28)) {
        B.prop({ kind: 'bamboo', x, y, solid: true })
        block(x, y)
      }
    }
  // Woods in the east, either side of the river; maples and pines at the mountain foot.
  zone(232, 2, 285, 176, 0.3, ['broad', 'broad', 'maple', 'cedar', 'pine'])
  zone(186, 63, 231, 79, 0.28, ['maple', 'pine', 'broad'])
  zone(60, 63, 97, 79, 0.28, ['maple', 'pine', 'broad'])
  zone(2, 59, 43, 63, 0.3, ['broad', 'maple', 'pine'])
  // A few trees round the farms; black pines along the beaches.
  zone(2, 64, 43, 175, 0.035, ['broad', 'persimmon', 'pine'])
  zone(2, 176, 35, 196, 0.08, ['blackpine'], [T.Sand, T.Grass])
  zone(241, 176, 285, 197, 0.08, ['blackpine'], [T.Sand, T.Grass])
  // Trees on the forest tiles (decoration: the forest itself blocks movement). The mountain gets
  // cedars and maples, the edges broadleaves and pines.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (B.get(x, y) !== T.Forest) continue
      const nearPath = [-1, 0, 1].some((d) => {
        const a = B.get(x, y + d)
        const b = B.get(x + d, y)
        return a === T.Road || b === T.Road || a === T.Stairs || b === T.Stairs
      })
      if (nearPath || r() > 0.5) continue
      const onMountain = y < 63 && x >= 60 && x < 232
      const v: TreeKind = onMountain ? (r() < 0.55 ? 'cedar' : r() < 0.5 ? 'maple' : 'pine') : y < 2 ? 'cedar' : r() < 0.5 ? 'broad' : 'pine'
      B.prop({ kind: 'tree', x, y, variant: v, solid: false })
    }
  // Bushes and rocks on leftover grass outside the walls.
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) {
      if (blocked[idx(x, y)] || B.get(x, y) !== T.Grass) continue
      const v = r()
      if (v < 0.025) {
        B.prop({ kind: 'bush', x, y, solid: true, name: 'Bush', text: 'A bush. It rustles. Probably a ninja. Probably a sparrow.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.035) {
        B.prop({ kind: 'rock', x, y, solid: true, name: 'Rock', text: 'A mossy rock. You feel a certain kinship.' })
        block(x - 1, y - 1, 3, 3)
      } else if (v < 0.045) {
        B.prop({ kind: 'hydrangea', x, y, solid: true, name: 'Hydrangea', text: 'Wild hydrangeas, blue and violet. The rainy season’s one good idea.' })
        block(x - 1, y - 1, 3, 3)
      }
    }
  // Reeds along the river; irises by the temple pond.
  for (let y = 2; y < 196; y++) {
    const c = riverX(y)
    for (const x of [c - 2, c + 2]) if (B.get(x, y) === T.Grass && !B.isTaken(x, y) && r() < 0.35) B.prop({ kind: 'reeds', x, y, solid: false })
  }
  for (let y = 2; y <= 10; y++)
    for (let x = 100; x <= 115; x++) {
      if (B.get(x, y) !== T.Grass || B.isTaken(x, y)) continue
      const wet = [B.get(x + 1, y), B.get(x - 1, y), B.get(x, y + 1), B.get(x, y - 1)].includes(T.Water)
      if (wet && r() < 0.5) B.prop({ kind: 'iris', x, y, solid: false })
    }
}
