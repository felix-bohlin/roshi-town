// Shared pieces of the town plan: small prop helpers, the kinds of house lots, and `band`, which
// lines one straight street with houses (the temple town uses it; Kumoi and the villages grow
// organically, see organic.ts).
//
// Buildings are drawn front-on with the door at the bottom, so a straight street is lined on its
// north side: a "band" of lots whose doors all open onto the street row below it.

import { pick, type Rng } from '../engine/rng'
import { T, type Builder, type Building, type BuildingKind, type Pt } from './layout'

/** The mountain's axis: the temple approach road, the first and last flights, the temple gate. */
export const AVE_X = 320

export function rect(x: number, y: number, w: number, h: number): Pt[] {
  const out: Pt[] = []
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) out.push({ x: i, y: j })
  return out
}

export function lantern(B: Builder, x: number, y: number): void {
  if (B.isTaken(x, y)) return
  B.prop({ kind: 'lantern', x, y, solid: true, name: 'Stone lantern', text: 'A stone lantern. At night a candle burns in it. By day a spider lives in it.' })
}

export function fenceRect(B: Builder, x0: number, y0: number, x1: number, y1: number, gates: Pt[]): void {
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue
      if (gates.some((g) => g.x === x && g.y === y)) continue
      if (B.isTaken(x, y)) continue
      B.prop({ kind: 'fence', x, y, solid: true, name: 'Fence' })
    }
}

export function stallText(v: string): string[] {
  switch (v) {
    case 'fish':
      return ['A fish stall. Mackerel, sea bream, and one octopus that is definitely still thinking.']
    case 'veg':
      return ['Daikon, eggplant, cucumbers. The cucumbers are suspiciously straight. Kiyo’s, then.']
    case 'fans':
      return ['Folding fans from Kyoto. One shows Mount Fuji. One shows a turtle. You feel seen.']
    default:
      return ['Pots, cups, bowls. A "rare" tea bowl, only slightly broken. Priced as if unbroken.']
  }
}

/** The place in the street just in front of a building's door. */
export function front(B: Builder, name: string, b: Building, dx = 0, dy = 0, face: 'down' | 'up' | 'left' | 'right' = 'down'): void {
  B.place(name, b.door.x + dx, b.door.y + dy, face)
}

// ---------------------------------------------------------------------------------------------
// Generated lots
// ---------------------------------------------------------------------------------------------

export interface Lot {
  kind: BuildingKind
  variant?: string
  w: number
  h: number
  name: string
  text: string[]
  /** Somebody lives here (passers-by get a home). */
  home?: boolean
}

export type Pool = (r: Rng) => Lot

const range = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1))

const HOUSE_TEXT = [
  'A townhouse. Through the lattice: a family eating, a grandmother asleep sitting up, a cat on the rice pot.',
  'A narrow townhouse, deep as a well. Somebody is arguing about money inside. Somebody is winning.',
  'A townhouse with a pot of morning glories by the door, watered with great seriousness.',
  'A shuttered townhouse. A note on the door: "Gone to Ise shrine. Back when the gods let us."',
  'A townhouse. The smell of grilled mackerel through the slats. Your stomach makes a turtle noise.',
  'A townhouse with a cracked roof tile and a bucket underneath, waiting for the rain.',
  'A townhouse. A child’s drawing of the castle pinned inside the window, with a dragon on top. Accurate.',
  'A tidy townhouse. Swept doorstep, salt piled by the door to keep bad luck out. You step round it.',
]
const ROW_TEXT = [
  'Row houses: thin walls, loud neighbours, and somebody frying fish right now.',
  'Row houses. A baby crying, a cat answering.',
  'Row houses. Laundry, cats, children, laundry.',
  'Row houses. Someone inside is practising the shakuhachi. Badly.',
  'Row houses. Six doors, one well, forty opinions.',
]
const SHOP: Record<string, { name: string; text: string[] }> = {
  rice: { name: 'Rice dealer', text: ['A rice dealer. Bales to the rafters and a clerk counting them twice.'] },
  sweets: { name: 'Sweet shop', text: ['Sweet bean cakes in the window. The window has nose prints. Children’s. Probably.'] },
  cloth: { name: 'Cloth shop', text: ['Bolts of indigo cotton, stacked like the sea at night.'] },
  medicine: { name: 'Apothecary', text: ['Dried roots, powdered horn, and a jar labelled "do not". Everyone respects the jar.'] },
  tofu: { name: 'Tofu shop', text: ['Tubs of tofu in cold water, and a tofu maker who has been awake since three.'] },
  incense: { name: 'Charm shop', text: ['Charms for luck, health, exams and safe travel. None for turtles. A gap in the market.'] },
  harbour: { name: 'Shipping agent', text: ['A shipping agent’s office: tide tables, ledgers, and a clerk asleep on both.'] },
}
const WORK_TEXT: Record<string, string[]> = {
  carpenter: ['A carpenter’s shop. Sawdust, planks, and a tune whistled slightly wrong.'],
  umbrella: ['Oiled-paper umbrellas drying open like flowers. The rainy season is good business.'],
}

export const houseLot = (r: Rng): Lot => ({ kind: 'machiya', w: range(r, 5, 7), h: 5, name: 'Townhouse', text: [pick(r, HOUSE_TEXT)], home: true })
export const rowLot = (r: Rng): Lot => ({ kind: 'nagaya', w: range(r, 10, 12), h: 4, name: 'Row houses', text: [pick(r, ROW_TEXT)], home: true })
export const shopLot = (r: Rng, variants = Object.keys(SHOP)): Lot => {
  const v = pick(r, variants)
  return { kind: 'shop', variant: v, w: 6, h: 5, name: SHOP[v].name, text: SHOP[v].text }
}
export const kuraLot = (): Lot => ({ kind: 'kura', w: 4, h: 5, name: 'Storehouse', text: ['A merchant’s storehouse. Thick white walls, a fireproof door, and a padlock the size of your head.'] })

/** Neighbourhood mixes. */
export const POOLS = {
  merchant: (r: Rng): Lot => {
    const v = r()
    return v < 0.4 ? shopLot(r) : v < 0.85 ? houseLot(r) : kuraLot()
  },
  crafts: (r: Rng): Lot => {
    const v = r()
    if (v < 0.35) return rowLot(r)
    if (v < 0.7) return houseLot(r)
    if (v < 0.82) {
      const k = pick(r, ['carpenter', 'umbrella'])
      return { kind: 'workshop', variant: k, w: 6, h: 5, name: k === 'carpenter' ? 'Carpenter' : 'Umbrella maker', text: WORK_TEXT[k] }
    }
    if (v < 0.9) return { kind: 'smithy', w: 6, h: 5, name: 'Smithy', text: ['A smithy. The ring of hammers, the hiss of quenching, a smith with no eyebrows.'] }
    return shopLot(r, ['tofu', 'sweets', 'rice'])
  },
  homes: (r: Rng): Lot => (r() < 0.5 ? rowLot(r) : houseLot(r)),
  inns: (r: Rng): Lot => {
    const v = r()
    if (v < 0.18) return { kind: 'inn', w: 9, h: 5, name: 'Inn', text: ['An inn. Straw sandals lined up at the door: pilgrims, merchants, and one pair of very small ones.'] }
    if (v < 0.36) return { kind: 'teahouse', w: 7, h: 5, name: 'Teahouse', text: ['A teahouse with red lanterns and a shamisen playing somewhere inside. Slowly. Beautifully.'] }
    if (v < 0.48) return { kind: 'tavern', w: 7, h: 5, name: 'Sake house', text: ['A sake house. Laughter, a song with more verses than anyone wanted, the clack of dice behind a screen.'] }
    if (v < 0.58) return shopLot(r, ['sweets', 'cloth', 'incense'])
    return houseLot(r)
  },
  samurai: (): Lot => ({ kind: 'samurai', w: 9, h: 6, name: 'Samurai residence', text: ['A samurai house: plaster walls, a pine pruned within an inch of its life.', 'A servant peers out, sees a turtle, and decides it is not their problem.'] }),
  pilgrims: (r: Rng): Lot => {
    const v = r()
    if (v < 0.3) return { kind: 'inn', w: 9, h: 5, name: 'Pilgrim inn', text: ['A pilgrims’ inn. Rows of walking staffs by the door, and the smell of feet and miso.'] }
    if (v < 0.6) return shopLot(r, ['incense', 'sweets'])
    if (v < 0.75) return { kind: 'teahouse', w: 7, h: 5, name: 'Teahouse', text: ['A teahouse for pilgrims about to climb the mountain, and pilgrims who just did and need to sit down.'] }
    return houseLot(r)
  },
}

/**
 * Line a street with lots. Buildings stand with their bottom row on `bottom` and their doors on the
 * street row just below; lots go left to right from x0 to x1, skipping taken tiles and `skip` columns
 * (lanes). Returns the buildings made.
 */
export function band(
  B: Builder,
  r: Rng,
  o: { x0: number; x1: number; bottom: number; maxH: number; pool: Pool; group: string; gap?: number; skip?: number[]; spotEvery?: number },
): Building[] {
  const out: Building[] = []
  const skip = new Set(o.skip ?? [])
  let x = o.x0
  let sinceSpot = 0
  while (x <= o.x1) {
    if (skip.has(x)) {
      x++
      continue
    }
    let lot = o.pool(r)
    lot = { ...lot, h: Math.min(lot.h, o.maxH) }
    // Shrink to fit the gap before the next lane, or settle for a house.
    let room = 0
    while (x + room <= o.x1 && !skip.has(x + room) && free(B, x + room, o.bottom - lot.h + 1, lot.h)) room++
    if (room < 4) {
      x += Math.max(1, room)
      continue
    }
    if (lot.w > room) lot = room >= 5 ? { ...houseLot(r), w: Math.min(room, 7), h: Math.min(5, o.maxH) } : { ...kuraLot(), h: Math.min(5, o.maxH) }
    if (lot.w > room) {
      x += room
      continue
    }
    const y = o.bottom - lot.h + 1
    const doorX = x + Math.floor(lot.w / 2)
    if (!walkable(B.get(doorX, o.bottom + 1))) {
      x++
      continue
    }
    const b = B.building({
      id: `lot${x}_${y}`,
      kind: lot.kind,
      variant: lot.variant,
      name: lot.name,
      x,
      y,
      w: lot.w,
      h: lot.h,
      doorX,
      text: lot.text,
      style: Math.floor(r() * 4),
      litHours: lot.home ? [[17 * 60 + Math.floor(r() * 90), 21 * 60 + Math.floor(r() * 150)]] : lot.kind === 'teahouse' || lot.kind === 'tavern' || lot.kind === 'inn' ? [[17 * 60, 24 * 60]] : undefined,
    })
    out.push(b)
    if (lot.home) B.home(o.group, b)
    if (lot.kind === 'inn') B.home('guests', b)
    sinceSpot += lot.w
    if (sinceSpot >= (o.spotEvery ?? 14)) {
      sinceSpot = 0
      B.spot(o.group, `spot:${b.id}`, b.door.x, b.door.y, 'down')
    }
    x += lot.w + (r() < (o.gap ?? 0.25) ? 1 : 0)
  }
  return out
}

const walkable = (t: number) => t === T.Road || t === T.Stone || t === T.Plaza || t === T.Gravel || t === T.Bridge

function free(B: Builder, x: number, y: number, h: number): boolean {
  for (let j = y; j < y + h; j++) {
    if (B.isTaken(x, j)) return false
    const t = B.get(x, j)
    if (t !== T.Grass) return false
  }
  return true
}
