// The mainland around the bay, and the villages on it:
//
//   Inaba      a farming village south-west of the West Gate: Gonbei's and Kiyo's farms, terraced
//              paddies, vegetable fields; the Iga refugee camp between it and the bridge
//   Hamana     a fishing village on the south shore, across the bridges from Shiomachi
//   Okitsu     a village on the east road, with paddies and a little market
//   the woods  north-east between the city and the mountain, the river, the old Kumoi shrine
//   Roshi's island out in the western sea
//
// (The temple village at the foot of the mountain comes with the mountain: world/mountain.ts.)

import { pick, rng, type Rng } from '../engine/rng'
import { CROP, idx, isWet, T, type Builder, type Building } from './layout'
import { nearestFree } from './kumoi'
import { bridge, docks, lots, prune, scatterPoints, streets, yards, type Waypoint } from './organic'
import { fenceRect, houseLot, kuraLot, lantern, shopLot, type Lot } from './plan'
import { blob, fillPoly, line, waterDistance, type P } from './shape'

/** Where the villages sit (village zones for the generator). */
export const VILLAGES = {
  inaba: { x: 46, y: 290, rx: 22, ry: 11 },
  hamana: { x: 190, y: 284, rx: 30, ry: 12 },
  okitsu: { x: 338, y: 204, rx: 24, ry: 14 },
}

export const ISLAND = { x: 16, y: 110 }

/** The river, as a polyline from the mountains to the bay. */
export const RIVER: P[] = [
  [394, 0],
  [386, 40],
  [372, 80],
  [352, 112],
  [326, 128],
  [300, 138],
]

export function mainland(B: Builder): void {
  // Land: the north-east (woods and the mountain), the east, and the south shore.
  fillPoly(B, [[200, -2], [402, -2], [402, 114], [312, 116], [292, 112], [270, 108], [256, 108], [246, 104], [240, 78], [228, 52], [214, 30], [206, 8]], T.Grass, { jitter: 3, seed: 51 })
  fillPoly(B, [[296, 110], [402, 110], [402, 322], [296, 322], [298, 262], [294, 230], [298, 200], [296, 170], [300, 140]], T.Grass, { jitter: 3, seed: 52 })
  fillPoly(B, [[-2, 272], [60, 271], [100, 274], [140, 268], [180, 266], [220, 266], [260, 265], [300, 264], [300, 322], [-2, 322]], T.Grass, { jitter: 2.5, seed: 53 })
  // Beaches where the land meets the sea.
  const coast = waterDistance(B)
  for (let i = 0; i < coast.length; i++) if (B.tiles[i] === T.Grass && coast[i] <= 2 && (i / B.w) | 0) B.tiles[i] = T.Sand
  line(B, RIVER, 3, T.Water, { over: [T.Grass, T.Sand] })
  // Forest along the land edges of the map.
  // (Gaps where the roads leave the map: west to Sakai, east to Okazaki.)
  for (let y = 0; y < B.h; y++)
    for (let x = 0; x < B.w; x++) {
      if (!(y <= 1 || x >= B.w - 2 || y >= B.h - 2 || x <= 1) || B.get(x, y) !== T.Grass) continue
      if ((x <= 1 && Math.abs(y - 290) <= 1) || (x >= B.w - 2 && Math.abs(y - 214) <= 1)) continue
      B.set(x, y, T.Forest)
    }
}

export function villages(B: Builder): { zone: Uint8Array } {
  const r = rng(1600)
  const zone = new Uint8Array(B.w * B.h)
  const reserved = new Uint8Array(B.w * B.h)
  const V = VILLAGES
  const markV = (id: number) => (x: number, y: number) => {
    zone[idx(x, y)] = id
  }
  blob(B, V.inaba.x, V.inaba.y, V.inaba.rx, V.inaba.ry, T.Grass, { jitter: 3, seed: 61, over: [T.Grass], each: markV(1) })
  blob(B, V.hamana.x, V.hamana.y, V.hamana.rx, V.hamana.ry, T.Grass, { jitter: 3, seed: 62, over: [T.Grass, T.Sand], each: markV(2) })
  blob(B, V.okitsu.x, V.okitsu.y, V.okitsu.rx, V.okitsu.ry, T.Grass, { jitter: 3, seed: 63, over: [T.Grass], each: markV(3) })

  const points: Waypoint[] = []
  farms(B, points)
  camp(B, points)
  hamana(B, r, points)
  okitsu(B, points)
  shrine(B, points)
  island(B)

  // A bridge over the river for the coast road north.
  const ry = 124
  let rx0 = -1
  let rx1 = -1
  for (let x = 290; x < 400; x++)
    if (B.get(x, ry) === T.Water) {
      if (rx0 < 0) rx0 = x
      rx1 = x
    }
  if (rx0 > 0) bridge(B, rx0 - 2, ry, rx1 + 2, ry, 2)

  // Country roads: one network over all the mainland, joining the villages, the bridges to the
  // city, the mountain road and the map edges.
  const W = B.w
  const land = (i: number) => {
    const t = B.tiles[i]
    return !isWet(t) && t !== T.Forest && t !== T.Cliff && (t === T.Grass || t === T.Sand || t === T.Road || t === T.Bridge)
  }
  const pt = (name: string, w = 2) => ({ ...B.places[name], w })
  const coastDist = waterDistance(B)
  points.unshift({ x: 320, y: 80, w: 2 })
  points.push(pt('northRoad'), pt('westRoad'), pt('southRoad'), pt('hamanaRoad'), pt('eastRoad'), { x: 0, y: 290, w: 2 }, { x: W - 1, y: 214, w: 2 }, { x: 300, y: 118, w: 2 })
  const inVillage = (x: number, y: number) => zone[idx(x, y)] > 0 && B.get(x, y) === T.Grass && coastDist[idx(x, y)] > 2
  const scatter = scatterPoints(B, r, inVillage, 8)
  streets(B, r, land, [...points, ...scatter], { seed: 71, loops: 20, ground: [T.Grass, T.Sand], coast: coastDist })
  B.place('westEdge', 0, 290, 'left')

  const villageLot = (x: number, y: number, rr: Rng): Lot | null => {
    const z = zone[idx(x, y)]
    if (!z) return null
    const v = rr()
    if (z === 2) {
      if (v < 0.5) return { kind: 'fishhut', w: 4, h: 4, name: 'Fisherfolk hut', text: [pick(rr, FISH_TEXT)], home: true }
      if (v < 0.8) return { kind: 'cottage', w: 6, h: 4, name: 'Cottage', text: [pick(rr, COTTAGE_TEXT)], home: true }
      if (v < 0.9) return { kind: 'hut', w: 4, h: 4, name: 'Net shed', text: ['A net shed. Nets, floats, and the smell of the sea, folded up and kept for later.'] }
      return { kind: 'tavern', w: 7, h: 5, name: 'Fishermen’s tavern', text: ['A tavern with one table, three stools and a cook who has opinions about how you eat your fish.'] }
    }
    if (v < 0.35) return { kind: 'minka', w: 7, h: 5, name: 'Farmhouse', text: [pick(rr, FARM_TEXT)], home: true }
    if (v < 0.6) return { kind: 'minkaOld', w: 6, h: 5, name: 'Old farmhouse', text: [pick(rr, FARM_TEXT)], home: true }
    if (v < 0.78) return { kind: 'cottage', w: 6, h: 4, name: 'Cottage', text: [pick(rr, COTTAGE_TEXT)], home: true }
    if (v < 0.86 && z === 3) return shopLot(rr, ['rice', 'tofu', 'sweets'])
    if (v < 0.92) return kuraLot()
    return { ...houseLot(rr), w: 6 }
  }
  const group = (x: number, y: number) => ['', 'inaba', 'hamana', 'okitsu'][zone[idx(x, y)]] ?? 'farm'
  lots(B, r, reserved, { ok: (x, y) => zone[idx(x, y)] > 0, ground: [T.Grass, T.Sand], pool: villageLot, group, prefix: 'v', density: 0.35, spotEvery: 10, nearStreet: true })
  docks(B, r, (x, y) => zone[idx(x, y)] === 2, { every: 9, maxLen: 7, boats: 0.8 })
  const hub = B.places.westRoad
  prune(B, hub)
  yards(B, r, hub, reserved, { ok: (x, y) => zone[idx(x, y)] > 0, ground: [T.Grass], trees: ['persimmon', 'broad', 'pine', 'maple'], garden: 0.3, nook: 0.15 })
  for (const [name, v] of Object.entries(V)) {
    const p = nearestFree(B, { x: v.x, y: v.y }, (x, y) => B.get(x, y) === T.Road)
    B.spot(name, `spot:${name}Centre`, p.x, p.y, 'down')
  }
  return { zone }
}

// ---------------------------------------------------------------------------------------------
// Inaba: the farms
// ---------------------------------------------------------------------------------------------

function farms(B: Builder, points: Waypoint[]): void {
  // Terraced paddies west and south of the village; vegetable fields east.
  for (let cx = 4; cx <= 40; cx += 6)
    for (let cy = 300; cy <= 312; cy += 4) {
      B.fillOver(cx, cy, 5, 3, T.Paddy, [T.Grass])
      for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (B.get(x, y) === T.Paddy && (x < 22 || y < 308)) B.planted[idx(x, y)] = 1
    }
  for (let cx = 4; cx <= 16; cx += 6)
    for (let cy = 276; cy <= 288; cy += 4) {
      B.fillOver(cx, cy, 5, 3, T.Paddy, [T.Grass])
      for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (B.get(x, y) === T.Paddy) B.planted[idx(x, y)] = 1
    }
  const field = (x: number, y: number, w: number, h: number, crop: number) => {
    B.fillOver(x, y, w, h, T.Field, [T.Grass])
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (B.get(i, j) === T.Field) B.crops[idx(i, j)] = crop
  }
  field(62, 300, 9, 5, CROP.daikon)
  field(73, 300, 9, 5, CROP.eggplant)
  field(62, 307, 9, 5, CROP.cabbage)
  field(73, 307, 9, 5, CROP.cucumber)

  const gonbei = B.building({ id: 'gonbei', kind: 'minka', name: "Gonbei's farmhouse", x: 30, y: 280, w: 7, h: 5, doorX: 33, text: 'Muddy sandals in four sizes. A chewed one in a fifth size: Pochi.' })
  B.building({ id: 'coop', kind: 'coop', name: 'Chicken coop', x: 39, y: 280, w: 3, h: 3, doorX: 40, text: 'The chicken coop. It smells of ambition.' })
  fenceRect(B, 38, 279, 43, 285, [{ x: 41, y: 285 }])
  const kiyo = B.building({ id: 'kiyo', kind: 'minkaOld', name: "Kiyo's farmhouse", x: 50, y: 290, w: 6, h: 5, doorX: 52, text: 'A sign: "Turtles will be made into soup." Underneath, smaller: "Eventually."' })
  const yasaku = B.building({ id: 'yasaku', kind: 'cottage', name: "Yasaku's cottage", x: 58, y: 282, w: 6, h: 4, doorX: 60, text: 'A carter’s cottage. A cart outside with one wheel slightly smaller than the other. It goes in circles. Slowly.' })
  const farmB = B.building({ id: 'farmB', kind: 'minkaOld', name: 'Farmhouse', x: 24, y: 290, w: 6, h: 5, doorX: 26, litHours: [[1080, 1290]], text: 'A farmhouse. Three generations, one hearth, and a grandfather who has opinions about all of it.' })
  const farmC = B.building({ id: 'farmC', kind: 'minka', name: 'Farmhouse', x: 40, y: 292, w: 7, h: 5, doorX: 43, litHours: [[1080, 1260]], text: 'A farmhouse with a straw rope over the door against bad luck. It has not worked yet, but it is patient.' })
  fenceRect(B, 46, 279, 52, 285, [{ x: 49, y: 285 }])
  B.prop({ kind: 'trough', x: 47, y: 280, solid: true, name: 'Trough', text: 'Benkei’s trough. Licked clean. Then licked again, just in case.' })
  B.prop({ kind: 'scarecrow', x: 20, y: 304, solid: true, name: 'Scarecrow', text: ['Gonbei’s scarecrow. The crows use it as a perch.', 'It’s had a hard life.'] })
  B.prop({ kind: 'scarecrow', x: 71, y: 306, solid: true, name: 'Scarecrow', text: 'Kiyo’s scarecrow. It’s wearing Kiyo’s old hat. The crows are genuinely afraid of it.' })
  B.prop({ kind: 'hay', x: 56, y: 296, solid: true, name: 'Haystack', text: 'A haystack. A child-shaped dent in one side. Taro’s "ninja hideout".' })
  B.prop({ kind: 'hay', x: 22, y: 285, solid: true, name: 'Haystack', text: 'A haystack. Perfect for a nap. You’re a turtle; everything is perfect for a nap.' })
  B.prop({ kind: 'firewood', x: 49, y: 293, solid: true, name: 'Firewood', text: 'Firewood, stacked with terrifying precision. Kiyo did this.' })
  B.prop({ kind: 'laundry', x: 28, y: 286, w: 2, solid: true, name: 'Laundry', text: 'Gonbei’s spare loincloth, flapping proudly. You look away respectfully.' })
  B.prop({ kind: 'jizo', x: 70, y: 286, solid: true, name: 'Jizō', text: ['A stone Jizō in a red bib, guardian of travellers.', 'Someone left him a rice ball. You consider it. You leave it. Good turtle.'] })
  B.prop({ kind: 'sign', x: 3, y: 288, solid: true, name: 'Signpost', text: ['← SAKAI. Five days’ walk.', 'For a turtle: next year.'] })
  for (const b of [gonbei, kiyo, yasaku, farmB, farmC]) points.push({ x: b.door.x, y: b.door.y, w: 1 })
  points.push({ x: 41, y: 286, w: 1 }, { x: 49, y: 286, w: 1 })
  B.place('gonbeiStep', gonbei.door.x + 1, gonbei.door.y, 'down')
  B.place('callKids', gonbei.door.x, gonbei.door.y, 'down')
  B.place('dogBed', gonbei.door.x - 1, gonbei.door.y)
  B.place('oxGate', 49, 286, 'up')
  B.place('laundryFarm', 28, 287, 'up')
  B.place('kiyoStep', kiyo.door.x, kiyo.door.y, 'down')
  B.place('farmRoad', 66, 292, 'down')
  points.push({ x: 66, y: 292, w: 2 }, { x: 28, y: 287, w: 1 })
  B.area('paddies', 3, 299, 43, 18, [T.Paddy])
  B.area('fields', 61, 299, 22, 14, [T.Field])
  B.area('chickenYard', 39, 280, 4, 5)
  B.area('oxPen', 47, 280, 5, 5)
  B.area('farmLane', 20, 270, 70, 30, [T.Road])
}

// ---------------------------------------------------------------------------------------------
// The refugee camp: Iga survivors on the common between Inaba and the West Gate bridge
// ---------------------------------------------------------------------------------------------

function camp(B: Builder, points: Waypoint[]): void {
  const tentText = (who: string) => [`A tent of patched rice sacks. ${who}`, 'It smells of woodsmoke and wet hemp. Everything out here does.']
  const tents: [string, number, number, string][] = [
    ['tentA', 80, 279, 'Old Sōkyū’s, and Masa’s. Two bedrolls, as far apart as the tent allows.'],
    ['tentB', 85, 282, 'Oshizu’s. Very tidy. Nothing to make untidy.'],
    ['tentC', 80, 286, 'Kotaro has drawn a turtle on it in charcoal. A heroic turtle. With a sword.'],
    ['tentD', 86, 289, 'A family of five sleeps in here. In shifts.'],
    ['tentE', 80, 293, 'Empty. A pair of straw sandals neatly side by side at the entrance. Nobody touches them.'],
  ]
  for (const [id, x, y, who] of tents) {
    const b = B.building({ id, kind: 'tent', name: 'Tent', x, y, w: 3, h: 2, doorX: x + 1, text: tentText(who) })
    points.push({ x: b.door.x, y: b.door.y, w: 1 })
  }
  B.prop({ kind: 'campfire', x: 84, y: 287, solid: true, name: 'Campfire', text: ['The camp’s fire. It never goes out: someone always sits up with it.', 'A pot of something grey bubbles over it. You decide it’s soup. It decides nothing.'] })
  B.prop({ kind: 'bedroll', x: 89, y: 280, solid: false, name: 'Bedroll', text: 'A bedroll airing in the open. It has been airing for a week. It is never going to be dry.' })
  B.prop({ kind: 'bedroll', x: 84, y: 293, solid: false, name: 'Bedroll', text: 'A spare bedroll. Spare since winter.' })
  B.prop({ kind: 'grave', x: 90, y: 294, variant: '2', solid: true, name: 'Grave', text: ['A fresh mound with a wooden marker. No name on it. Just: "from Iga".', 'Someone has left a wildflower. Kotaro, probably. He’d deny it.'] })
  B.place('campFireW', 83, 287, 'right')
  B.place('campFireS', 84, 288, 'up')
  B.place('campEdge', 79, 296, 'left')
  B.place('campN', 82, 277, 'up')
  points.push({ x: 84, y: 289, w: 1 }, { x: 79, y: 296, w: 1 })
  B.area('camp', 78, 276, 14, 21, [T.Grass])
  B.spot('camp', 'spot:camp1', 88, 286, 'left')
  B.spot('camp', 'spot:camp2', 82, 283, 'down')
}

// ---------------------------------------------------------------------------------------------
// Hamana: the fishing village on the south shore
// ---------------------------------------------------------------------------------------------

function hamana(B: Builder, r: Rng, points: Waypoint[]): void {
  void r
  B.prop({ kind: 'nets', x: 172, y: 276, solid: true, name: 'Fishing nets', text: 'Nets drying in the sun. A cat asleep in one, like a fish that got lucky.' })
  B.prop({ kind: 'nets', x: 204, y: 278, solid: true, name: 'Fishing nets', text: 'Nets, floats and a broken oar. The oar has a name carved in it: "NEVER AGAIN".' })
  B.building({ id: 'hamanaShrine', kind: 'shrine', variant: 'small', name: 'Ebisu shrine', x: 188, y: 292, w: 4, h: 3, doorX: 189, text: ['A shrine to Ebisu, god of fishermen, the one with the fishing rod and the big laugh.', 'The offerings are all fish. Ebisu appears to have eaten them. Or the cats have.'] })
  points.push({ x: 189, y: 295, w: 1 })
  const beach = nearestFree(B, { x: 180, y: 270 }, (x, y) => B.get(x, y) === T.Sand)
  B.place('beachWestSpot', beach.x, beach.y, 'down')
  B.area('beachWest', 150, 262, 90, 12, [T.Sand])
}

// ---------------------------------------------------------------------------------------------
// Okitsu: the east village, and the old shrine in the woods
// ---------------------------------------------------------------------------------------------

function okitsu(B: Builder, points: Waypoint[]): void {
  for (let cx = 344; cx <= 380; cx += 6)
    for (let cy = 222; cy <= 238; cy += 4) {
      B.fillOver(cx, cy, 5, 3, T.Paddy, [T.Grass])
      for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (B.get(x, y) === T.Paddy) B.planted[idx(x, y)] = 1
    }
  B.building({ id: 'okitsuInn', kind: 'inn', name: 'Okitsu post inn', x: 330, y: 196, w: 9, h: 5, doorX: 334, litHours: [[1080, 1380]], text: ['The post inn at Okitsu, last stop before Kumoi. Tired horses, tired porters, and a cook who never sleeps.', 'A notice: "NO KAPPA. NO TURTLES. Kappa disguised as turtles, ESPECIALLY no."'] })
  points.push({ x: 334, y: 201, w: 2 })
  B.prop({ kind: 'sign', x: 396, y: 211, solid: true, name: 'Signpost', text: ['OKAZAKI → Three provinces. Mountains, bandits, ninja.', 'Not recommended for turtles.'] })
}

function shrine(B: Builder, points: Waypoint[]): void {
  const sx = 372
  const sy = 150
  B.fill(sx - 4, sy - 2, 11, 12, T.Gravel)
  const s: Building = B.building({ id: 'shrine', kind: 'shrine', name: 'Old Kumoi Shrine', x: sx - 2, y: sy - 1, w: 8, h: 5, doorX: sx + 1, text: ['An offering box. You have no coins.', 'You offer a respectful nod instead. The kami nod back. Probably.'] })
  B.prop({ kind: 'komainu', x: sx - 3, y: sy + 5, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth open: "a". Its partner says "un". Together: everything.' })
  B.prop({ kind: 'komainu', x: sx + 5, y: sy + 5, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth closed: "un". It has nothing more to say.' })
  lantern(B, sx - 1, sy + 7)
  lantern(B, sx + 3, sy + 7)
  B.prop({ kind: 'torii', x: sx - 1, y: sy + 9, w: 4, solid: true, name: 'Torii', text: 'The torii of the old shrine. Past it is the kami’s ground. Wipe your feet. All four.' })
  B.place('shrineFront', s.door.x, s.door.y + 1, 'up')
  B.area('shrineGrounds', sx - 4, sy + 4, 11, 5, [T.Gravel])
  points.push({ x: sx + 1, y: sy + 10, w: 1 })
  // The river bank a little way downstream.
  const bank = nearestFree(B, { x: 352, y: 106 }, (x, y) => B.get(x, y) === T.Grass && B.get(x - 1, y) === T.Water)
  B.place('riverbank', bank.x, bank.y, 'left')
  points.push({ ...bank, w: 1 })
}

// ---------------------------------------------------------------------------------------------
// Roshi's island
// ---------------------------------------------------------------------------------------------

function island(B: Builder): void {
  const { x: cx, y: cy } = ISLAND
  blob(B, cx, cy, 11, 6, T.Sand, { jitter: 1, seed: 81 })
  B.building({ id: 'kamehouse', kind: 'kamehouse', name: 'Kame House', x: cx - 3, y: cy - 5, w: 6, h: 4, doorX: cx - 1, text: ['KAME HOUSE. Pink walls, red roof, a lifebuoy, and a stack of "reading material" by the door.', 'You do not read the reading material. You are a good turtle.'] })
  B.prop({ kind: 'tree', x: cx - 7, y: cy, variant: 'blackpine', solid: true, name: 'Pine', text: 'A crooked pine. Roshi says he planted it. Roshi says a lot of things.' })
  B.prop({ kind: 'tree', x: cx + 6, y: cy - 2, variant: 'blackpine', solid: true })
  B.prop({ kind: 'sign', x: cx + 4, y: cy + 2, solid: true, name: 'Sign', text: ['"TURTLE SCHOOL. Est. three hundred years ago."', 'Underneath: "Students: 1 (turtle). Fees: sake."'] })
  B.place('roshiChair', cx + 2, cy + 2, 'down')
  B.place('roshiDoor', cx - 1, cy, 'down')
  B.place('roshiShore', cx - 1, cy + 3, 'down')
  B.area('island', cx - 10, cy - 4, 20, 9, [T.Sand])
}

const FISH_TEXT = [
  'A fisherman’s hut. Drying squid hung like laundry, and a grandmother mending a net with her toes.',
  'A hut of salt-grey boards. The door is a net. The net is also the window.',
  'A fisherman’s hut with a fish-shaped weathervane that points, unhelpfully, at the sea.',
]
const COTTAGE_TEXT = [
  'A thatched cottage leaning on its neighbour like a friend after the tavern.',
  'A cottage that smells of seaweed and pickles. Someone inside is singing, badly, about the sea.',
  'A cottage with a pumpkin vine climbing onto the roof. The pumpkins have the best view in the village.',
]
const FARM_TEXT = [
  'A farmhouse. Muddy sandals by the door, a hoe against the wall, and a cat asleep on both.',
  'A thatched farmhouse with smoke leaking through the roof, the way it is supposed to.',
  'A farmhouse. Inside, someone is telling someone else exactly how the rice should have been planted.',
]

