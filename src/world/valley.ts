// The Kumoi valley, Ise Province, 1582: a handful of villages between the mountain and the sea,
// laid out by hand and joined by country roads.
//
//   Kumoi      the market village in the middle: the square with Oume's teahouse, shops round it,
//              the inn and the brewery on the east road, the craftsmen's lane, a duck pond
//   the manor  the lord's moated manor north-west, and the samurai lane down to the square
//   Inaba      the farming hamlet west along the road: Gonbei's and Kiyo's farms, the ox pen,
//              terraced paddies and vegetable fields; the Iga refugee camp nearer Kumoi
//   Hamana     the harbour village on the south shore: quay, piers, fish market, the Drunken
//              Octopus, the shipwright, fishermen's huts, a lighthouse on the breakwater
//   Okitsu     the post village over the river on the east road, with its inn and paddies
//   the woods  north-east beyond the river, with the old Kumoi shrine
//   the bay    south and west, and Roshi's island out in it
//
// (Kōun-ji, the thousand steps and the temple village at their foot are world/mountain.ts.)
// Village houses that nobody in particular lives in are packed in by world/organic.ts, with room
// left round each for a garden.

import { pick, rng, type Rng } from '../engine/rng'
import { CROP, idx, isWet, T, type Builder, type Building, type BuildingKind, type Dir, type Pt } from './layout'
import { bridge, gate, lots, prune, yards } from './organic'
import { fenceRect, houseLot, kuraLot, lantern, shopLot, stallText, type Lot } from './plan'
import { blob, fillPoly, line, waterDistance, type P } from './shape'

/** Where the mountain (planned at x 100–186 in its own coordinates) sits on the map. */
export const MOUNTAIN_DX = -20

/** The market square. */
export const SQUARE = { x0: 104, y0: 99, x1: 140, y1: 112 }

export const ISLAND = { x: 34, y: 182 }

/** The river, from the hills to the sea. */
export const RIVER: P[] = [
  [226, -1],
  [222, 24],
  [212, 46],
  [200, 66],
  [194, 88],
  [192, 110],
  [188, 134],
  [184, 150],
  [182, 172],
]

/** The coastline: land above, sea below (y of the first sea row at each x). */
const COAST: P[] = [
  [0, 158],
  [40, 160],
  [58, 162],
  [184, 162],
  [200, 165],
  [240, 168],
]

const ROAD_TILES = new Set<number>([T.Road, T.Stone, T.Gravel, T.Bridge, T.Pier, T.Plaza, T.Stairs])

export interface Valley {
  /** Settled ground (villages, the manor), kept free of wild trees. */
  settled: Uint8Array
  flow: Uint8Array
  hub: Pt
}

// ---------------------------------------------------------------------------------------------
// The land
// ---------------------------------------------------------------------------------------------

/** Grass, the sea, beaches, the river and the forest round the edges. Runs before the mountain. */
export function land(B: Builder, flow: Uint8Array): void {
  B.fill(0, 0, B.w, B.h, T.Grass)
  for (let x = 0; x < B.w; x++) {
    const y0 = coastY(x)
    for (let y = y0; y < B.h; y++) B.set(x, y, T.Sea)
  }
  // Rocks and a little cove at the river mouth.
  blob(B, 196, 176, 3, 2, T.Sand, { jitter: 1, seed: 21 })
  blob(B, 222, 186, 4, 2, T.Sand, { jitter: 1, seed: 22 })
  const coast = waterDistance(B)
  for (let i = 0; i < coast.length; i++) if (B.tiles[i] === T.Grass && coast[i] <= 2) B.tiles[i] = T.Sand
  line(B, RIVER, 3, T.Water, { over: [T.Grass, T.Sand, T.Sea], each: (x, y) => (flow[idx(x, y)] = 1) })
  // The forest that closes the valley in: the north-west hills and a thick belt round the edges,
  // with gaps where the road leaves west for Sakai and east for Okazaki.
  fillPoly(B, [[-2, -2], [46, -2], [46, 30], [40, 52], [30, 60], [-2, 62]], T.Forest, { jitter: 2, seed: 31 })
  for (let y = 0; y < B.h; y++)
    for (let x = 0; x < B.w; x++) {
      const t = B.get(x, y)
      if (t !== T.Grass && t !== T.Sand) continue
      const edge = Math.min(x, B.w - 1 - x, y)
      const deep = 2 + Math.floor(((Math.sin(x * 0.31 + y * 0.17) + 1) / 2) * 2)
      if (edge >= deep) continue
      if (Math.abs(y - 120) <= 2 && x < 10) continue
      if (Math.abs(y - 110) <= 2 && x > B.w - 10) continue
      B.set(x, y, T.Forest)
    }
}

function coastY(x: number): number {
  for (let k = 0; k + 1 < COAST.length; k++) {
    const [ax, ay] = COAST[k]
    const [bx, by] = COAST[k + 1]
    if (x >= ax && x <= bx) {
      const base = ay + ((by - ay) * (x - ax)) / (bx - ax)
      // The harbour front is dead straight; the rest wanders a little.
      const wobble = x >= 56 && x <= 186 ? 0 : Math.round(Math.sin(x * 0.21) * 1.2 + Math.sin(x * 0.07) * 1.5)
      return Math.round(base) + wobble
    }
  }
  return 168
}

// ---------------------------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------------------------

/** The roads between the villages. Odd widths centre on .5, even widths on whole tiles. */
export function roads(B: Builder): void {
  const road = (pts: P[], w: number) => line(B, pts, w, T.Road, { over: [T.Grass, T.Sand, T.Road] })
  // North: from the temple village down to the square.
  B.fill(120, 78, 4, 21, T.Road)
  // West: to the samurai lane, the camp, Inaba, and on out of the valley to Sakai.
  road([[-1, 120.5], [24, 119.5], [48, 115.5], [70, 109.5], [86, 106.5], [105, 106.5]], 3)
  // East: past the inn, over the river to Okitsu and on to Okazaki.
  road([[139, 106.5], [160, 106.5], [176, 108.5], [184, 110.5], [241, 110.5]], 3)
  // South: down to the harbour.
  road([[121.5, 111], [121.5, 128], [119.5, 140], [119.5, 160]], 3)
  // The harbour street along the back of the quay.
  road([[56, 151], [186, 151]], 2)
  // The samurai lane, from the manor gate to the square.
  road([[43, 78], [47, 78], [47, 92.5], [102.5, 92.5], [102.5, 100]], 3)
  // The craftsmen's lane and the brewery lane south of the square.
  road([[94, 121], [121, 121]], 2)
  road([[140, 111], [140, 120], [172, 120]], 2)
  // Village lanes: Kumoi north of the pond, and the inn quarter and the craftsmen's back lane.
  road([[124, 88], [178, 88]], 2)
  road([[140, 128], [182, 128]], 2)
  road([[126, 135], [182, 135]], 2)
  road([[86, 141], [118, 141]], 2)
  // Inaba: the lane from the samurai quarter down through the hamlet to the farm lane, a lane
  // west under the manor, the farm lane itself.
  road([[47, 92], [47, 131]], 2)
  road([[4, 106], [47, 106]], 2)
  road([[6, 131], [67, 131]], 2)
  // Okitsu: a lane behind the inn, a lane below the paddies, and up the river to the old shrine.
  road([[200, 100], [236, 100]], 2)
  road([[200, 140], [236, 140]], 2)
  road([[202, 111], [202, 140]], 2)
  road([[214, 110], [216, 82], [223, 56]], 2)
  // The river crossing on the east road.
  bridge(B, 184, 109, 200, 109, 3)
}

// ---------------------------------------------------------------------------------------------
// Kumoi
// ---------------------------------------------------------------------------------------------

interface Spec {
  id: string
  kind: BuildingKind
  variant?: string
  name: string
  x: number
  y: number
  w: number
  h: number
  text: string | string[]
  litHours?: [number, number][]
}

/** A hand-placed building; the spot must be clear grass (or the ground it says). */
function put(B: Builder, s: Spec, ground: number[] = [T.Grass]): Building {
  for (let y = s.y; y < s.y + s.h; y++)
    for (let x = s.x; x < s.x + s.w; x++)
      if (!B.inside(x, y) || B.isTaken(x, y) || !ground.includes(B.get(x, y))) throw new Error(`${s.id} doesn't fit: ${x},${y} is ${B.get(x, y)}${B.isTaken(x, y) ? ' (taken)' : ''}`)
  return B.building({ ...s, doorX: s.x + Math.floor(s.w / 2) })
}

export function kumoi(B: Builder): Building {
  const S = SQUARE
  // The square: paved, its bottom corners rounded off.
  for (let y = S.y0; y <= S.y1; y++)
    for (let x = S.x0; x <= S.x1; x++) {
      const corner = y >= S.y1 - 1 && (x <= S.x0 + 1 || x >= S.x1 - 1) && !(y === S.y1 - 1 && (x === S.x0 + 1 || x === S.x1 - 1))
      if (!corner) B.set(x, y, T.Stone)
    }
  // The duck pond north-east of the square.
  blob(B, 152, 92, 6, 3, T.Water, { jitter: 1, seed: 41 })

  // Round the square.
  put(B, { id: 'riceShop', kind: 'shop', variant: 'rice', name: 'Rihei Rice Merchant', x: 106, y: 94, w: 6, h: 5, text: ['Rice bales stacked to the rafters. A sign: "Rice for samurai stipends. And everyone else, at a markup."'] })
  const tea = put(B, { id: 'teahouse', kind: 'teahouse', name: "Oume's Teahouse", x: 112, y: 93, w: 7, h: 6, text: ['The curtain reads: TEA · DANGO · GOSSIP.', 'The gossip is free. The dango is not.'] })
  put(B, { id: 'sweetShop', kind: 'shop', variant: 'sweets', name: 'Yohei Sweets', x: 125, y: 94, w: 6, h: 5, text: ['Sweet bean cakes in the window. The window has nose prints. Children’s. Probably.'] })
  put(B, { id: 'watchtower', kind: 'watchtower', name: 'Fire watchtower', x: 132, y: 96, w: 3, h: 3, text: ['The fire watchtower. A bell at the top for fires, earthquakes and, once, a very large carp.', 'Climbing is forbidden. Also impossible, for you.'] })
  put(B, { id: 'inari', kind: 'shrine', variant: 'small', name: 'Inari shrine', x: 136, y: 96, w: 4, h: 3, text: ['A tiny Inari shrine. Two stone foxes guard it.', 'Someone left fried tofu. The foxes did not eat it. Suspicious foxes.'] })
  // West road.
  put(B, { id: 'bathhouse', kind: 'bathhouse', name: 'Bathhouse', x: 92, y: 99, w: 8, h: 6, text: ['The bathhouse. Blue curtain for men, red for women.', 'No sign about turtles. You note that for later.'] })
  put(B, { id: 'clothShop', kind: 'shop', variant: 'cloth', name: 'Osen Cloth', x: 85, y: 100, w: 6, h: 5, text: ['Bolts of indigo and persimmon cloth. One very loud bolt of pink. Osen calls it "bold".'] })
  put(B, { id: 'medicine', kind: 'shop', variant: 'medicine', name: 'Sōan Medicines', x: 77, y: 100, w: 6, h: 5, text: ['Dried roots, powdered horn, and a jar labelled "do not". Everyone respects the jar.'] })
  put(B, { id: 'doctor', kind: 'machiya', variant: 'doctor', name: 'Doctor’s house', x: 88, y: 110, w: 6, h: 5, text: ['The doctor’s house. A sign: "Back soon. If not, boil water anyway."'] })
  // East road.
  put(B, { id: 'tofu', kind: 'shop', variant: 'tofu', name: 'Heikichi Tofu', x: 144, y: 100, w: 6, h: 5, text: ['Tubs of tofu in cold water. The tofu maker has been awake since three. It shows.'] })
  put(B, { id: 'inn', kind: 'inn', name: 'Shiokaze Inn', x: 152, y: 99, w: 9, h: 6, litHours: [[1080, 1380]], text: ['The Shiokaze Inn. "Travellers, merchants, pilgrims. Turtles by arrangement."', 'Arrangement not available.'] })
  put(B, { id: 'brewery', kind: 'brewery', name: 'Kurozaemon Brewery', x: 146, y: 112, w: 9, h: 7, text: ['A sign on the door: NO TURTLES.', 'It has a little drawing of a turtle with a line through it. Very specific.'] })
  put(B, { id: 'kuraBrew', kind: 'kura', name: 'Brewery storehouse', x: 157, y: 114, w: 4, h: 5, text: ['Locked. It smells of sake. Your errand is in there. So close.'] })
  // The craftsmen's lane.
  put(B, { id: 'smithy', kind: 'smithy', name: 'Tetsuzō Forge', x: 96, y: 115, w: 6, h: 5, text: ['The forge. It’s hot enough to boil a turtle. Do not lean in.', 'Hammers, tongs, and a half-finished kitchen knife "for a samurai’s wife".'] })
  put(B, { id: 'carpenter', kind: 'workshop', variant: 'carpenter', name: 'Gorō Carpentry', x: 103, y: 115, w: 6, h: 5, text: ['Sawdust, planks, and a half-built shrine for somebody’s grandmother.'] })
  put(B, { id: 'umbrella', kind: 'workshop', variant: 'umbrella', name: 'Okane Umbrellas', x: 110, y: 115, w: 6, h: 5, text: ['Oiled-paper umbrellas drying open like flowers. The rainy season is good business.'] })
  put(B, { id: 'nagayaA', kind: 'nagaya', name: 'Row houses', x: 96, y: 124, w: 12, h: 4, text: ['Row houses: thin walls, loud neighbours, and somebody frying fish right now.'] })
  put(B, { id: 'nagayaB', kind: 'nagaya', name: 'Row houses', x: 96, y: 131, w: 12, h: 4, text: ['Row houses. A baby crying, a cat answering.'] })
  put(B, { id: 'houseHachi', kind: 'machiya', name: 'Townhouse', x: 111, y: 124, w: 6, h: 5, text: ['A townhouse. Muddy little footprints lead in, out, and up the wall.'] })
  put(B, { id: 'nagayaC', kind: 'nagaya', name: 'Row houses', x: 126, y: 124, w: 12, h: 4, litHours: [[1080, 1320]], text: ['Row houses. Someone inside is practising the shakuhachi. Badly.'] })

  squareProps(B, tea)
  const door = (name: string, id: string, dx = 0, face: Dir = 'down') => {
    const b = B.buildings.find((k) => k.id === id)!
    B.place(name, b.door.x + dx, b.door.y, face)
  }
  door('riceFront', 'riceShop')
  door('sweetFront', 'sweetShop')
  door('watchtowerFoot', 'watchtower')
  door('inariFront', 'inari', 0, 'up')
  door('catInari', 'inari', 1)
  door('bathFront', 'bathhouse')
  door('clothFront', 'clothShop')
  door('medicineFront', 'medicine')
  door('innFront', 'inn')
  door('tofuFront', 'tofu')
  door('brewFront', 'brewery')
  door('kuraBrewFront', 'kuraBrew')
  door('smithyFront', 'smithy')
  door('anvil', 'smithy', -1, 'up')
  door('carpenterFront', 'carpenter')
  door('umbrellaFront', 'umbrella')

  // The four road barriers round the village: a guard hut and a bar across the road.
  const post = (id: string, name: string, x: number, y: number, text: string[]) => put(B, { id, kind: 'guardpost', name, x, y, w: 4, h: 3, litHours: [[1080, 1440]], text })
  post('postN', 'North barrier', 125, 84, ['The north barrier, on the temple road. A bar across the road that is always up.', 'A board lists who may pass: pilgrims, monks, porters and "persons of good character". You are a turtle of excellent character.'])
  B.place('northGateGuard', 124, 86, 'left')
  B.place('northRoad', 121, 81, 'up')
  post('postW', 'West barrier', 58, 106, ['The west barrier, on the Sakai road.', 'Rokusuke checks travel passes here. He holds them upside down. Nobody has the heart to tell him.'])
  B.place('westGateGuard', 61, 110, 'down')
  B.place('westRoad', 52, 115, 'down')
  post('postE', 'East barrier', 200, 105, ['The east barrier, at the Okitsu end of the bridge. Travellers from Okazaki pay a toll here.', 'The toll for turtles is not on the list. Matabei is thinking about it.'])
  B.place('eastGateGuard', 201, 109, 'left')
  B.place('eastRoad', 226, 110, 'right')
  post('postS', 'Harbour barrier', 123, 136, ['The harbour barrier, where the road comes down to Hamana. Cargo is counted here, twice, by two men who disagree.'])
  B.place('seaGateGuard', 122, 139, 'right')
  B.place('seaGateNight', 120, 140, 'down')
  B.place('southRoad', 120, 145, 'down')

  // Places in the streets.
  B.place('mainStreetW', 84, 107, 'right')
  B.place('mainStreetE', 170, 107, 'left')
  B.place('southStreetW', 108, 121, 'right')
  B.place('southStreetE', 160, 120, 'left')
  B.place('wallLaneW', 66, 111, 'right')
  B.place('wallLaneE', 180, 109, 'left')
  B.place('samuraiLane', 68, 92, 'right')

  // Lanterns along the roads into the square, and a couple of benches by the pond.
  for (const [x, y] of [
    [118, 84],
    [118, 92],
    [124, 92],
    [103, 104],
    [141, 104],
    [118, 116],
    [124, 116],
    [90, 104],
    [165, 104],
  ])
    lantern(B, x, y)
  B.prop({ kind: 'bench', x: 147, y: 96, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A bench by the duck pond. The ducks consider it theirs and you a guest.' })
  B.prop({ kind: 'tree', x: 158, y: 95, variant: 'willow', solid: true, name: 'Willow', text: 'A willow trailing its hair in the pond. Poets come here to be sad on purpose.' })
  B.prop({ kind: 'tree', x: 145, y: 90, variant: 'willow', solid: true, name: 'Willow', text: 'A willow. A heron stands under it, pretending to be a stick.' })
  return tea
}

/** Market stalls, benches, boards, the well and the old camphor on the square. */
function squareProps(B: Builder, tea: Building): void {
  const stall = (x: number, y: number, v: string, name?: string) => {
    B.prop({ kind: 'stall', x, y, w: 2, variant: v, solid: true, name: 'Market stall', text: stallText(v) })
    if (name) B.place(name, x, y - 1, 'down')
    else B.spot('stalls', `stall:${x}_${y}`, x, y - 1, 'down')
  }
  // Two rows of stalls with an aisle down the middle (the north road comes in at x 120–123).
  stall(107, 104, 'fish', 'fishStall')
  stall(110, 104, 'veg', 'vegStall')
  stall(113, 104, 'pots')
  stall(127, 104, 'fans', 'fanStall')
  stall(130, 104, 'pots', 'potStall')
  stall(133, 104, 'veg', 'vegStall2')
  stall(107, 109, 'veg')
  stall(110, 109, 'fish')
  stall(130, 109, 'fish')
  stall(133, 109, 'fans')
  B.place('stall', 117, 108, 'down')
  B.prop({ kind: 'table', x: 125, y: 109, solid: true, name: 'Fortune table', text: 'A fortune teller’s table: bamboo sticks, a cracked bowl, and a sign: "THE FUTURE. Cheap."' })
  B.place('fortune', 125, 108, 'down')
  // Oume's benches in front of the teahouse.
  B.prop({ kind: 'bench', x: 111, y: 101, w: 2, variant: 'parasol', solid: true, npcSolid: false, name: 'Bench', text: 'A teahouse bench under a red parasol. The red felt is warm from the sun.' })
  B.place('teaBench1', 111, 101, 'down')
  B.place('teaBench2', 112, 101, 'down')
  B.prop({ kind: 'bench', x: 116, y: 101, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A teahouse bench. Someone left a dango skewer. Heisuke, probably.' })
  B.place('teaBench3', 116, 101, 'down')
  B.place('teaBench4', 117, 101, 'down')
  B.place('teaCounter', tea.door.x, tea.door.y, 'down')
  B.place('catTea', tea.door.x - 1, tea.door.y)
  B.prop({ kind: 'nobori', x: 119, y: 100, solid: true, name: 'Banner', text: 'A banner: 茶 (tea). Flapping like it’s proud of it.' })
  B.prop({ kind: 'bench', x: 106, y: 111, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A stone bench, worn smooth by a hundred years of gossip.' })
  B.place('squareBench1', 106, 111, 'up')
  B.place('squareBench2', 107, 111, 'up')
  B.prop({ kind: 'well', x: 136, y: 107, solid: true, name: 'Well', text: 'You look down the well. A turtle looks back up. Handsome fellow.' })
  B.place('squareWell', 136, 108, 'up')
  B.place('catWell', 137, 108)
  B.prop({ kind: 'board', x: 104, y: 103, w: 2, solid: true, name: 'Notice board', text: NOTICES })
  B.place('notice', 105, 104, 'up')
  B.prop({ kind: 'board', x: 138, y: 103, w: 2, variant: 'contracts', solid: true, name: 'Contracts', text: CONTRACTS })
  B.prop({ kind: 'tree', x: 136, y: 101, variant: 'sacred', solid: true, name: 'Old camphor', text: 'The square’s old camphor tree. Everyone meets "under the camphor". Everyone is late.' })
  B.place('camphor', 136, 102, 'up')
  B.place('beggarSpot', 119, 111, 'up')
  B.prop({ kind: 'kago', x: 128, y: 112, w: 2, solid: true, name: 'Palanquin', text: ['A palanquin, waiting for someone important.', 'The bearers are at the teahouse. The important person is also at the teahouse.'] })
  for (const [x, y] of [
    [105, 100],
    [139, 111],
  ])
    B.prop({ kind: 'tree', x, y, variant: 'pine', solid: true, name: 'Pine', text: 'A pine pruned into clouds. The gardener visits weekly and argues with it.' })
  for (let i = 0; i < 8; i++) {
    const x = [108, 115, 118, 125, 129, 134, 112, 131][i]
    const y = [106, 106, 103, 103, 106, 106, 111, 111][i]
    B.spot('town', `spot:sq${i}`, x, y, 'down')
  }
}

// ---------------------------------------------------------------------------------------------
// The lord's manor and the samurai lane
// ---------------------------------------------------------------------------------------------

export function manor(B: Builder): void {
  const x0 = 8
  const y0 = 64
  const x1 = 42
  const y1 = 90
  const gy = 77
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || y === y0 || y === y1) B.set(x, y, T.Water)
  B.fill(x0 + 1, y0 + 1, x1 - x0 - 1, y1 - y0 - 1, T.Gravel)
  gate(B, 'gateCastle', 'Manor gate', { x: x1, y: gy }, 'right', 2, ['The manor gate. Two very straight guards could stand here.', 'Today there is one slightly bent guard and a cat.'], 'inner')
  const text = 'The manor wall. White plaster, black tiles. Lords like white.'
  for (let y = y0 + 1; y < y1; y++)
    for (let x = x0 + 1; x < x1; x++) {
      if (x !== x0 + 1 && x !== x1 - 1 && y !== y0 + 1 && y !== y1 - 1) continue
      if (!B.isTaken(x, y) && B.get(x, y) !== T.Stone) B.prop({ kind: 'wall', x, y, solid: true, name: 'Manor wall', text })
    }
  put(B, { id: 'castle', kind: 'castle', name: 'Kumoi Manor', x: 16, y: 67, w: 13, h: 9, litHours: [[1080, 1380]], text: ['The lord’s manor house: a little keep, three roofs, two golden fish on top, one lord who is never home.', 'The steward says the lord is "in Kyoto, with Lord Nobunaga". Must be nice.'] }, [T.Gravel])
  const stable = put(B, { id: 'stable', kind: 'workshop', variant: 'stable', name: 'Stable', x: 33, y: 80, w: 6, h: 4, text: 'The manor stable. One horse. It looks at you as if you are the slowest thing it has ever seen. It is right.' }, [T.Gravel])
  put(B, { id: 'barracks', kind: 'nagaya', name: 'Barracks', x: 12, y: 80, w: 12, h: 4, litHours: [[1080, 1320]], text: 'The barracks. Twenty straw mats, twenty pairs of sandals, one smell.' }, [T.Gravel])
  put(B, { id: 'castleKura', kind: 'kura', name: 'Manor storehouse', x: 33, y: 67, w: 4, h: 5, text: 'The manor’s rice store. Guarded by two spearmen and, more effectively, by the cat.' }, [T.Gravel])
  for (const [x, y, k] of [
    [11, 68, 'pine'],
    [12, 74, 'maple'],
    [39, 73, 'pine'],
    [38, 87, 'maple'],
  ] as const)
    B.prop({ kind: 'tree', x, y, variant: k, solid: true })
  for (const [x, y] of [
    [20, 77],
    [27, 77],
    [20, 87],
    [30, 87],
  ])
    lantern(B, x, y)
  B.place('castleGateGuard', x1 + 1, gy, 'right')
  B.place('castleYard', 26, 85, 'down')
  B.place('castleSteps', 22, 77, 'down')
  B.place('stableFront', stable.door.x, stable.door.y, 'down')
  B.area('castleYard', x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3, [T.Gravel])
  B.area('moatSouth', x0, y0, x1 - x0 + 1, y1 - y0 + 1, [T.Water])

  // The samurai lane: the two named households, more generated alongside.
  put(B, { id: 'samuraiSakuma', kind: 'samurai', name: 'Sakuma residence', x: 58, y: 85, w: 9, h: 6, text: ['The Sakuma residence: plaster walls, a pine pruned within an inch of its life.', 'A servant peers out, sees a turtle, and decides it is not their problem.'] })
  put(B, { id: 'samuraiIori', kind: 'samurai', name: 'Iori residence', x: 70, y: 85, w: 9, h: 6, text: ['The steward Iori’s residence. Ledgers stacked in the window. Even the cat looks audited.'] })
}

// ---------------------------------------------------------------------------------------------
// Hamana: the harbour village
// ---------------------------------------------------------------------------------------------

export function hamana(B: Builder): void {
  // The quay along the harbour front, the breakwater with its lighthouse, the piers.
  for (let x = 56; x <= 186; x++) for (let y = 159; y <= 161; y++) B.set(x, y, T.Stone)
  for (let y = 162; y <= 171; y++) for (let x = 176; x <= 178; x++) B.set(x, y, T.Stone)
  const pier = (x: number, len: number) => {
    for (let y = 162; y < 162 + len; y++) B.fill(x, y, 2, 1, T.Pier)
  }
  pier(70, 7)
  pier(94, 9)
  pier(132, 7)
  pier(156, 6)
  B.prop({ kind: 'ship', x: 98, y: 168, w: 10, h: 4, solid: true, name: 'Merchant ship', text: ['The merchant ship "Ise Maru". A big square sail, a painted eye on the bow.', 'The eye follows you. It’s just paint. Probably.'] })
  for (const [x, y] of [
    [73, 167],
    [135, 166],
    [159, 166],
    [91, 164],
  ])
    B.prop({ kind: 'boat', x, y, solid: true, name: 'Fishing boat', text: pick(rng(x * 7 + y), BOAT_TEXT) })
  B.prop({ kind: 'lighthouse', x: 177, y: 170, solid: true, name: 'Lighthouse', text: ['A stone lighthouse at the end of the breakwater. A fire burns in it all night.', 'Somebody has to carry oil up there every evening. That somebody complains a lot.'] })
  B.place('lighthouseFoot', 177, 169, 'up')
  B.place('breakwater', 178, 168, 'down')

  // Between the harbour street and the quay: doors onto the quay.
  const ship = put(B, { id: 'shipwright', kind: 'shipwright', name: 'Shipwright', x: 62, y: 154, w: 8, h: 5, text: ['A half-built boat on its frame, like the bones of a whale.', 'Chalked on the hull: "FAST. FOR AN IMPORTANT GUEST. DON’T ASK."'] })
  const wh = put(B, { id: 'warehouseE1', kind: 'kura', variant: 'harbour', name: 'Warehouse', x: 72, y: 154, w: 7, h: 5, text: ['A warehouse full of rice bales. The rats here are very well fed and very polite.'] })
  const market = put(B, { id: 'fishmarket', kind: 'fishmarket', name: 'Fish market', x: 82, y: 155, w: 10, h: 4, text: ['The fish market. Bonito, sea bream, squid, and a very large tuna nobody can afford.', 'The cats have formed a union.'] })
  const office = put(B, { id: 'office', kind: 'shop', variant: 'harbour', name: 'Harbour office', x: 96, y: 154, w: 6, h: 5, text: ['The harbour office. A chart of the bay, a tide table, and a list titled "Boats for important guests".'] })
  const tavern = put(B, { id: 'tavern', kind: 'tavern', name: 'The Drunken Octopus', x: 104, y: 154, w: 7, h: 5, litHours: [[1020, 1440]], text: ['A tavern. Red lanterns, loud sailors, and a sign: "THE DRUNKEN OCTOPUS".', 'The octopus on the sign is, to be fair, drunk.'] })
  const sanpei = put(B, { id: 'fishhut', kind: 'fishhut', name: "Sanpei's hut", x: 128, y: 155, w: 4, h: 4, text: ['A board nailed by the door: "BIGGEST CARP: 3 shaku." Someone has crossed it out and written "1".'] })
  const nets = put(B, { id: 'fishhut2', kind: 'fishhut', name: 'Fisherfolk hut', x: 134, y: 155, w: 4, h: 4, text: ['A net-mender’s hut. Nets inside, nets outside, nets on the roof.'] })
  put(B, { id: 'netshed', kind: 'hut', name: 'Net shed', x: 140, y: 155, w: 4, h: 4, text: ['A shed of old nets, older ropes, and one ancient boat paddle with teeth marks.'] })
  put(B, { id: 'nagayaD', kind: 'nagaya', name: 'Row houses', x: 147, y: 155, w: 12, h: 4, litHours: [[1080, 1300]], text: ['Row houses. Laundry, cats, children, laundry.'] })
  put(B, { id: 'ruin', kind: 'ruin', name: 'Burnt house', x: 163, y: 155, w: 6, h: 4, text: ['A burnt-out house. The neighbours say it was a cooking fire. They say it quickly, and look up at the manor.', 'Among the ashes: a tea kettle, perfectly fine. Kettles survive everything. Kettles, turtles and cockroaches.'] })
  // North of the street.
  const joshoji = put(B, { id: 'joshoji', kind: 'hondo', name: 'Jōshō-ji', x: 62, y: 143, w: 12, h: 7, litHours: [[1080, 1260]], text: ['Jōshō-ji, the harbour temple. Fishermen pray here for calm seas, and their wives for the fishermen to come home sober.', 'The priest says the mountain temple is "for tourists". The mountain temple says nothing. It is up a mountain.'] })
  put(B, { id: 'hamanaShrine', kind: 'shrine', variant: 'small', name: 'Ebisu shrine', x: 170, y: 147, w: 4, h: 3, text: ['A shrine to Ebisu, god of fishermen, the one with the fishing rod and the big laugh.', 'The offerings are all fish. Ebisu appears to have eaten them. Or the cats have.'] })

  B.place('slipway', ship.door.x, ship.door.y, 'up')
  B.place('warehouseFront', wh.door.x, wh.door.y, 'down')
  B.place('fishCounter', market.door.x, market.door.y, 'down')
  B.place('fishCounter2', market.door.x + 1, market.door.y, 'down')
  B.place('catFish', market.door.x - 1, market.door.y)
  B.place('catFish2', market.door.x + 3, market.door.y + 1)
  B.place('catFish3', market.door.x - 3, market.door.y + 1)
  B.place('officeFront', office.door.x, office.door.y, 'down')
  B.place('tavernFront', tavern.door.x, tavern.door.y, 'down')
  B.place('tavernIn1', tavern.door.x + 1, tavern.door.y, 'down')
  B.place('quayE', sanpei.door.x, sanpei.door.y, 'down')
  B.place('netMend', nets.door.x, nets.door.y, 'down')
  B.place('joshojiFront', joshoji.door.x, joshoji.door.y, 'up')
  B.place('quayW', 76, 160, 'down')
  B.place('harbourStreet', 100, 151, 'down')
  B.place('pierW', 70, 168, 'down')
  B.place('pierMidFoot', 94, 162, 'down')
  B.place('shipSide', 95, 166, 'right')
  B.place('pierMid', 94, 170, 'down')
  B.place('pierE', 132, 168, 'down')
  for (const [n, x, y, g] of [
    ['h1', 71, 165, 'harbour'],
    ['h2', 157, 166, 'hamana'],
    ['h3', 150, 160, 'hamana'],
    ['h4', 84, 151, 'harbour'],
  ] as const)
    B.spot(g, `spot:${n}`, x, y, 'down')
  // Quay clutter.
  for (const [k, x, y, name, t] of [
    ['bales', 80, 161, 'Rice bales', 'Rice bales for the ship. Each one stamped twice, by two clerks who don’t speak to each other.'],
    ['crates', 112, 160, 'Crates', 'Crates of something. One of them is labelled "NOT SAKE". It is sake.'],
    ['anchor', 125, 161, 'Anchor', 'A spare anchor. Rusty, enormous, and the favourite seat of every gull in the harbour.'],
    ['nets', 145, 161, 'Fishing nets', 'Nets drying in the sun. A cat asleep in one, like a fish that got lucky.'],
    ['casks', 103, 161, 'Casks', 'Sake casks waiting for the ship. Kurozaemon’s, with his crest. Not the good stuff. You can tell.'],
  ] as const)
    B.prop({ kind: k, x, y, solid: true, name, text: t })

  // The beach west of the harbour.
  B.place('beachWestSpot', 32, 157, 'down')
  B.area('beachWest', 2, 150, 54, 14, [T.Sand])
}

const BOAT_TEXT = [
  'A fishing boat, rocking gently. It smells of fish and very old decisions.',
  'A boat with an eye painted on the bow, so it can see where it’s going. It’s going nowhere. It’s tied up.',
  'A little boat full of nets and one sleeping cat.',
]

// ---------------------------------------------------------------------------------------------
// Inaba: the farms, and the refugee camp
// ---------------------------------------------------------------------------------------------

export function inaba(B: Builder): void {
  // Terraced paddies south of the farm lane; vegetable fields to the east.
  for (let cx = 5; cx <= 35; cx += 6)
    for (let cy = 135; cy <= 147; cy += 4) {
      B.fillOver(cx, cy, 5, 3, T.Paddy, [T.Grass])
      for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (B.get(x, y) === T.Paddy && (x < 24 || y < 143)) B.planted[idx(x, y)] = 1
    }
  const field = (x: number, y: number, w: number, h: number, crop: number) => {
    B.fillOver(x, y, w, h, T.Field, [T.Grass])
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (B.get(i, j) === T.Field) B.crops[idx(i, j)] = crop
  }
  field(44, 135, 9, 5, CROP.daikon)
  field(55, 135, 9, 5, CROP.eggplant)
  field(44, 142, 9, 5, CROP.cabbage)
  field(55, 142, 9, 5, CROP.cucumber)

  const farmB = put(B, { id: 'farmB', kind: 'minkaOld', name: 'Farmhouse', x: 6, y: 124, w: 6, h: 5, litHours: [[1080, 1290]], text: 'A farmhouse. Three generations, one hearth, and a grandfather who has opinions about all of it.' })
  const gonbei = put(B, { id: 'gonbei', kind: 'minka', name: "Gonbei's farmhouse", x: 14, y: 124, w: 7, h: 5, text: 'Muddy sandals in four sizes. A chewed one in a fifth size: Pochi.' })
  put(B, { id: 'coop', kind: 'coop', name: 'Chicken coop', x: 25, y: 124, w: 3, h: 3, text: 'The chicken coop. It smells of ambition.' })
  fenceRect(B, 24, 123, 29, 129, [{ x: 27, y: 129 }])
  const kiyo = put(B, { id: 'kiyo', kind: 'minkaOld', name: "Kiyo's farmhouse", x: 31, y: 124, w: 6, h: 5, text: 'A sign: "Turtles will be made into soup." Underneath, smaller: "Eventually."' })
  fenceRect(B, 38, 123, 44, 129, [{ x: 41, y: 129 }])
  B.prop({ kind: 'trough', x: 39, y: 124, solid: true, name: 'Trough', text: 'Benkei’s trough. Licked clean. Then licked again, just in case.' })
  put(B, { id: 'yasaku', kind: 'cottage', name: "Yasaku's cottage", x: 50, y: 125, w: 6, h: 4, text: 'A carter’s cottage. A cart outside with one wheel slightly smaller than the other. It goes in circles. Slowly.' })
  put(B, { id: 'farmC', kind: 'minka', name: 'Farmhouse', x: 58, y: 124, w: 7, h: 5, litHours: [[1080, 1260]], text: 'A farmhouse with a straw rope over the door against bad luck. It has not worked yet, but it is patient.' })
  B.prop({ kind: 'cart', x: 56, y: 129, w: 2, solid: true, name: 'Cart', text: 'Yasaku’s cart. One wheel slightly smaller than the other. It goes in circles. Slowly.' })
  B.prop({ kind: 'scarecrow', x: 20, y: 146, solid: true, name: 'Scarecrow', text: ['Gonbei’s scarecrow. The crows use it as a perch.', 'It’s had a hard life.'] })
  B.prop({ kind: 'scarecrow', x: 53, y: 141, solid: true, name: 'Scarecrow', text: 'Kiyo’s scarecrow. It’s wearing Kiyo’s old hat. The crows are genuinely afraid of it.' })
  B.prop({ kind: 'hay', x: 38, y: 133, solid: true, name: 'Haystack', text: 'A haystack. A child-shaped dent in one side. Taro’s "ninja hideout".' })
  B.prop({ kind: 'hay', x: 4, y: 133, solid: true, name: 'Haystack', text: 'A haystack. Perfect for a nap. You’re a turtle; everything is perfect for a nap.' })
  B.prop({ kind: 'firewood', x: 30, y: 122, solid: true, name: 'Firewood', text: 'Firewood, stacked with terrifying precision. Kiyo did this.' })
  B.prop({ kind: 'laundry', x: 12, y: 122, w: 2, solid: true, name: 'Laundry', text: 'Gonbei’s spare loincloth, flapping proudly. You look away respectfully.' })
  B.prop({ kind: 'jizo', x: 66, y: 116, solid: true, name: 'Jizō', text: ['A stone Jizō in a red bib, guardian of travellers.', 'Someone left him a rice ball. You consider it. You leave it. Good turtle.'] })
  B.prop({ kind: 'sign', x: 3, y: 117, solid: true, name: 'Signpost', text: ['← SAKAI. Five days’ walk.', 'For a turtle: next year.'] })
  B.place('gonbeiStep', gonbei.door.x + 1, gonbei.door.y, 'down')
  B.place('callKids', gonbei.door.x, gonbei.door.y + 1, 'down')
  B.place('dogBed', gonbei.door.x - 1, gonbei.door.y)
  B.place('oxGate', 41, 130, 'up')
  B.place('laundryFarm', 13, 123, 'up')
  B.place('kiyoStep', kiyo.door.x, kiyo.door.y, 'down')
  B.place('farmRoad', 64, 131, 'down')
  B.place('westEdge', 0, 120, 'left')
  void farmB
  B.area('paddies', 4, 134, 37, 17, [T.Paddy])
  B.area('fields', 43, 134, 22, 14, [T.Field])
  B.area('chickenYard', 25, 124, 4, 5)
  B.area('oxPen', 39, 124, 5, 5)
  B.area('farmLane', 2, 112, 68, 22, [T.Road])

  // The refugee camp: Iga survivors on the common between Inaba and Kumoi.
  const tentText = (who: string) => [`A tent of patched rice sacks. ${who}`, 'It smells of woodsmoke and wet hemp. Everything out here does.']
  const tents: [string, number, number, string][] = [
    ['tentA', 70, 117, 'Old Sōkyū’s, and Masa’s. Two bedrolls, as far apart as the tent allows.'],
    ['tentB', 76, 119, 'Oshizu’s. Very tidy. Nothing to make untidy.'],
    ['tentC', 70, 123, 'Kotaro has drawn a turtle on it in charcoal. A heroic turtle. With a sword.'],
    ['tentD', 78, 125, 'A family of five sleeps in here. In shifts.'],
    ['tentE', 71, 129, 'Empty. A pair of straw sandals neatly side by side at the entrance. Nobody touches them.'],
  ]
  for (const [id, x, y, who] of tents) put(B, { id, kind: 'tent', name: 'Tent', x, y, w: 3, h: 2, text: tentText(who) })
  B.prop({ kind: 'campfire', x: 75, y: 124, solid: true, name: 'Campfire', text: ['The camp’s fire. It never goes out: someone always sits up with it.', 'A pot of something grey bubbles over it. You decide it’s soup. It decides nothing.'] })
  B.prop({ kind: 'bedroll', x: 81, y: 118, solid: false, name: 'Bedroll', text: 'A bedroll airing in the open. It has been airing for a week. It is never going to be dry.' })
  B.prop({ kind: 'bedroll', x: 76, y: 130, solid: false, name: 'Bedroll', text: 'A spare bedroll. Spare since winter.' })
  B.prop({ kind: 'grave', x: 82, y: 131, variant: '2', solid: true, name: 'Grave', text: ['A fresh mound with a wooden marker. No name on it. Just: "from Iga".', 'Someone has left a wildflower. Kotaro, probably. He’d deny it.'] })
  B.place('campFireW', 74, 124, 'right')
  B.place('campFireS', 75, 125, 'up')
  B.place('campEdge', 68, 132, 'left')
  B.place('campN', 73, 115, 'up')
  B.area('camp', 67, 114, 17, 20, [T.Grass])
  B.spot('camp', 'spot:camp1', 80, 123, 'left')
  B.spot('camp', 'spot:camp2', 73, 121, 'down')
}

// ---------------------------------------------------------------------------------------------
// Okitsu, the old shrine in the woods, Roshi's island
// ---------------------------------------------------------------------------------------------

export function okitsu(B: Builder): void {
  for (let cx = 205; cx <= 229; cx += 6)
    for (let cy = 115; cy <= 127; cy += 4) {
      B.fillOver(cx, cy, 5, 3, T.Paddy, [T.Grass])
      for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (B.get(x, y) === T.Paddy) B.planted[idx(x, y)] = 1
    }
  put(B, { id: 'okitsuInn', kind: 'inn', name: 'Okitsu post inn', x: 218, y: 103, w: 9, h: 5, litHours: [[1080, 1380]], text: ['The post inn at Okitsu, first stop on the road to Okazaki. Tired horses, tired porters, and a cook who never sleeps.', 'A notice: "NO KAPPA. NO TURTLES. Kappa disguised as turtles, ESPECIALLY no."'] })
  B.prop({ kind: 'sign', x: 236, y: 108, solid: true, name: 'Signpost', text: ['OKAZAKI → Three provinces. Mountains, bandits, ninja.', 'Not recommended for turtles.'] })
  B.prop({ kind: 'trough', x: 229, y: 107, solid: true, name: 'Trough', text: 'A trough for the post horses. One of them drank out of it and looked at you as if you were next.' })

  // The old shrine up the river.
  const sx = 222
  const sy = 44
  B.fill(sx - 4, sy - 2, 11, 12, T.Gravel)
  const s = put(B, { id: 'shrine', kind: 'shrine', name: 'Old Kumoi Shrine', x: sx - 2, y: sy - 1, w: 8, h: 5, text: ['An offering box. You have no coins.', 'You offer a respectful nod instead. The kami nod back. Probably.'] }, [T.Gravel])
  B.prop({ kind: 'komainu', x: sx - 3, y: sy + 5, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth open: "a". Its partner says "un". Together: everything.' })
  B.prop({ kind: 'komainu', x: sx + 5, y: sy + 5, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth closed: "un". It has nothing more to say.' })
  lantern(B, sx - 1, sy + 7)
  lantern(B, sx + 3, sy + 7)
  B.prop({ kind: 'torii', x: sx - 1, y: sy + 9, w: 4, solid: true, name: 'Torii', text: 'The torii of the old shrine. Past it is the kami’s ground. Wipe your feet. All four.' })
  B.place('shrineFront', s.door.x, s.door.y + 1, 'up')
  B.area('shrineGrounds', sx - 4, sy + 4, 11, 5, [T.Gravel])
  // The river bank a little way downstream.
  const bank = nearestFree(B, { x: 203, y: 72 }, (x, y) => B.get(x, y) === T.Grass && B.get(x - 1, y) === T.Water)
  B.place('riverbank', bank.x, bank.y, 'left')
}

export function island(B: Builder): void {
  const { x: cx, y: cy } = ISLAND
  blob(B, cx, cy, 11, 6, T.Sand, { jitter: 1, seed: 81 })
  put(B, { id: 'kamehouse', kind: 'kamehouse', name: 'Kame House', x: cx - 3, y: cy - 5, w: 6, h: 4, text: ['KAME HOUSE. Pink walls, red roof, a lifebuoy, and a stack of "reading material" by the door.', 'You do not read the reading material. You are a good turtle.'] }, [T.Sand])
  B.prop({ kind: 'tree', x: cx - 7, y: cy, variant: 'blackpine', solid: true, name: 'Pine', text: 'A crooked pine. Roshi says he planted it. Roshi says a lot of things.' })
  B.prop({ kind: 'tree', x: cx + 6, y: cy - 2, variant: 'blackpine', solid: true })
  B.prop({ kind: 'sign', x: cx + 4, y: cy + 2, solid: true, name: 'Sign', text: ['"TURTLE SCHOOL. Est. three hundred years ago."', 'Underneath: "Students: 1 (turtle). Fees: sake."'] })
  B.place('roshiChair', cx + 2, cy + 2, 'down')
  B.place('roshiDoor', cx, cy - 1, 'down')
  B.place('roshiShore', cx - 1, cy + 3, 'down')
  B.area('island', cx - 10, cy - 4, 20, 9, [T.Sand])
}

// ---------------------------------------------------------------------------------------------
// Village houses, gardens and footpaths
// ---------------------------------------------------------------------------------------------

/** Neighbourhoods, for who lives where and wanders where. */
function group(x: number, y: number): string | null {
  if (x >= 196 && y >= 88 && y <= 142) return 'okitsu'
  if (y >= 142 && x >= 52 && x <= 188) return x < 100 && y >= 146 ? 'harbour' : 'hamana'
  if (x >= 46 && x <= 104 && y >= 78 && y <= 93) return 'samurai'
  if (x >= 4 && x <= 48 && y >= 94 && y <= 132) return 'inaba'
  if (x >= 49 && x <= 186 && y >= 80 && y <= 142) {
    if (y >= 113 && x < 122) return 'crafts'
    if (x >= 140 || (y >= 113 && x >= 122)) return 'inns'
    return 'town'
  }
  return null
}

export function houses(B: Builder, r: Rng, hub: Pt): void {
  const reserved = new Uint8Array(B.w * B.h)
  const pool = (x: number, y: number, rr: Rng): Lot | null => {
    const g = group(x, y)
    const v = rr()
    switch (g) {
      case 'town':
        return v < 0.3 ? shopLot(rr) : v < 0.8 ? houseLot(rr) : kuraLot()
      case 'inns':
        return v < 0.12 ? { kind: 'teahouse', w: 7, h: 5, name: 'Teahouse', text: ['A teahouse with red lanterns and a shamisen playing somewhere inside. Slowly. Beautifully.'] } : v < 0.2 ? { kind: 'tavern', w: 7, h: 5, name: 'Sake house', text: ['A sake house. Laughter, a song with more verses than anyone wanted, the clack of dice behind a screen.'] } : v < 0.7 ? houseLot(rr) : cottage(rr)
      case 'crafts':
        return v < 0.5 ? houseLot(rr) : v < 0.8 ? cottage(rr) : { kind: 'workshop', variant: pick(rr, ['carpenter', 'umbrella']), w: 6, h: 5, name: 'Workshop', text: ['A workshop. Sawdust, shavings, a tune whistled slightly wrong.'] }
      case 'samurai':
        return v < 0.6 ? { kind: 'samurai', w: 9, h: 6, name: 'Samurai residence', text: ['A samurai house: plaster walls, a pine pruned within an inch of its life.'] } : houseLot(rr)
      case 'harbour':
      case 'hamana':
        return v < 0.45 ? { kind: 'fishhut', w: 4, h: 4, name: 'Fisherfolk hut', text: [pick(rr, FISH_TEXT)], home: true } : v < 0.85 ? cottage(rr) : { kind: 'kura', variant: 'harbour', w: 7, h: 5, name: 'Warehouse', text: [pick(rr, WAREHOUSE_TEXT)] }
      case 'inaba':
      case 'okitsu':
        return v < 0.4 ? { kind: 'minka', w: 7, h: 5, name: 'Farmhouse', text: [pick(rr, FARM_TEXT)], home: true } : v < 0.7 ? { kind: 'minkaOld', w: 6, h: 5, name: 'Old farmhouse', text: [pick(rr, FARM_TEXT)], home: true } : v < 0.9 || g === 'inaba' ? cottage(rr) : shopLot(rr, ['rice', 'tofu', 'sweets'])
    }
    return null
  }
  lots(B, r, reserved, { ok: (x, y) => group(x, y) !== null, ground: [T.Grass], pool, group: (x, y) => group(x, y) ?? 'town', prefix: 'v', density: 0.5, spotEvery: 12, nearStreet: true, margin: 1 })
  prune(B, hub)
}

const cottage = (r: Rng): Lot => ({ kind: 'cottage', w: 6, h: 4, name: 'Cottage', text: [pick(r, COTTAGE_TEXT)], home: true })

/**
 * A footpath from every door that isn't on a road to the nearest road, and a garden by each
 * village house: a vegetable patch, flowers or a fruit tree, sometimes a little fence.
 */
export function gardens(B: Builder, r: Rng, hub: Pt): void {
  const places = new Set(Object.values(B.places).map((p) => idx(p.x, p.y)))
  for (const b of B.buildings) {
    if (b.kind === 'gate' || b.kind === 'gateSide' || ROAD_TILES.has(B.get(b.door.x, b.door.y))) continue
    footpath(B, b.door)
  }
  for (const b of B.buildings) {
    if (b.style === undefined && !['minka', 'minkaOld', 'cottage', 'fishhut', 'samurai'].includes(b.kind)) continue
    // Beside the house, on whichever side has room.
    for (const side of r() < 0.5 ? [-1, 1] : [1, -1]) {
      const w = 3
      const x0 = side < 0 ? b.x - w - 1 : b.x + b.w + 1
      const y0 = b.y + b.h - 3
      let ok = true
      for (let y = y0 - 1; y <= y0 + 3 && ok; y++)
        for (let x = x0 - 1; x <= x0 + w && ok; x++) if (!B.inside(x, y) || B.isTaken(x, y) || B.get(x, y) !== T.Grass || places.has(idx(x, y))) ok = false
      if (!ok) continue
      const v = r()
      if (v < 0.4 && b.kind !== 'samurai') {
        // A kitchen garden.
        const crop = pick(r, [CROP.daikon, CROP.eggplant, CROP.cabbage, CROP.cucumber])
        for (let y = y0; y < y0 + 3; y++)
          for (let x = x0; x < x0 + w; x++) {
            B.set(x, y, T.Field)
            B.crops[idx(x, y)] = crop
          }
      } else if (v < 0.75) {
        for (let k = 0; k < 3; k++) B.prop({ kind: 'flowers', x: x0 + k, y: y0 + 2, variant: pick(r, FLOWERS), solid: true, name: 'Flowers', text: pick(r, FLOWER_TEXT) })
        if (r() < 0.6) B.prop({ kind: 'tree', x: x0 + 1, y: y0, variant: pick(r, ['persimmon', 'maple', 'broad'] as const), solid: true })
      } else {
        B.prop({ kind: 'tree', x: x0 + 1, y: y0 + 1, variant: b.kind === 'fishhut' ? 'blackpine' : pick(r, ['persimmon', 'persimmon', 'maple'] as const), solid: true })
      }
      break
    }
  }
  // Pots of flowers either side of shop and house doors in Kumoi.
  for (const b of B.buildings) {
    const g = group(b.door.x, b.door.y)
    if (g !== 'town' && g !== 'inns' && g !== 'crafts') continue
    for (const dx of [-2, 2]) {
      const x = b.door.x + dx
      const y = b.door.y - 0
      if (r() < 0.5 || B.isTaken(x, y) || places.has(idx(x, y)) || B.get(x, y) !== T.Grass) continue
      if (blocksPath(B, x, y)) continue
      B.prop({ kind: 'flowers', x, y, variant: 'pot', solid: true, name: 'Potted plant', text: pick(r, POT_TEXT) })
    }
  }
  yards(B, r, hub, new Uint8Array(B.w * B.h), { ok: (x, y) => group(x, y) !== null, ground: [T.Grass], trees: ['persimmon', 'broad', 'maple', 'pine'], garden: 0.3, nook: 0.12 })
}

/** Would a solid thing here cut a tile off from its neighbours? (Only allow it in open ground.) */
function blocksPath(B: Builder, x: number, y: number): boolean {
  let open = 0
  for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) if ((i !== x || j !== y) && !B.isTaken(i, j) && !isWet(B.get(i, j))) open++
  return open < 7
}

/** Breadth-first from a door over open grass to the nearest road; the way is worn into a path. */
function footpath(B: Builder, from: Pt): void {
  const prev = new Int32Array(B.w * B.h).fill(-1)
  const start = idx(from.x, from.y)
  prev[start] = start
  const q = [start]
  for (let h = 0; h < q.length && h < 4000; h++) {
    const i = q[h]
    const x = i % B.w
    const y = (i / B.w) | 0
    if (i !== start && ROAD_TILES.has(B.tiles[i])) {
      for (let j = prev[i]; j !== start; j = prev[j]) if (B.tiles[j] === T.Grass || B.tiles[j] === T.Sand) B.tiles[j] = T.Road
      if (B.tiles[start] === T.Grass || B.tiles[start] === T.Sand) B.tiles[start] = T.Road
      return
    }
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      if (!B.inside(nx, ny)) continue
      const j = idx(nx, ny)
      const t = B.tiles[j]
      if (prev[j] >= 0 || B.taken[j] || isWet(t) || t === T.Forest || t === T.Cliff || t === T.Paddy || t === T.Field) continue
      prev[j] = i
      q.push(j)
    }
  }
}

/** The nearest tile to `at` where `ok` holds and nothing stands. */
export function nearestFree(B: Builder, at: Pt, ok: (x: number, y: number) => boolean): Pt {
  for (let rad = 0; rad < 40; rad++)
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue
        const x = at.x + dx
        const y = at.y + dy
        if (B.inside(x, y) && ok(x, y) && !B.isTaken(x, y)) return { x, y }
      }
  throw new Error(`nothing free near ${at.x},${at.y}`)
}

// ---------------------------------------------------------------------------------------------
// Areas villagers work and wander in
// ---------------------------------------------------------------------------------------------

export function areas(B: Builder): void {
  const S = SQUARE
  B.area('square', S.x0, S.y0, S.x1 - S.x0 + 1, S.y1 - S.y0 + 1, [T.Stone])
  B.area('teaFront', 108, 99, 13, 4, [T.Stone])
  B.area('mainStreet', 60, 98, 130, 26, [T.Road])
  B.area('brewYard', 142, 119, 30, 3, [T.Road])
  B.area('southStreet', 92, 113, 32, 30, [T.Road])
  B.area('samuraiLane', 44, 76, 62, 20, [T.Road])
  B.area('carpentry', 94, 119, 28, 4, [T.Road])
  B.area('moat', 145, 88, 15, 8, [T.Water])
  B.area('quay', 56, 159, 131, 3, [T.Stone])
  B.area('harbourStreet', 56, 148, 131, 4, [T.Road])
  B.area('docks', 56, 150, 131, 22, [T.Stone, T.Road, T.Pier])
  B.area('shipwrightYard', 58, 159, 14, 3, [T.Stone])
}

export function districts(B: Builder): void {
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
  B.district('Kumoi Manor', 6, 62, 40, 31)
  B.district('Samurai Lane', 44, 76, 60, 20)
  B.district('Town Square', 103, 92, 39, 22)
  B.district('Duck Pond', 142, 86, 20, 11)
  B.district('Craftsmen’s Lane', 90, 113, 32, 26)
  B.district('Refugee Camp', 66, 112, 20, 22)
  B.district('Inaba', 0, 96, 66, 56)
  B.district('Okitsu', 198, 88, 42, 54)
  B.district('Old Kumoi Shrine', 214, 38, 18, 18)
  B.district('Hamana Harbour', 54, 134, 134, 40)
  B.district('Kumoi', 66, 78, 132, 64)
  B.district('Hamana Beach', 0, 148, 56, 20)
  B.district('The River', 186, 0, 30, 175)
  B.district('Northern Woods', 196, 0, 44, 88)
  B.district('Ise Bay', 0, 0, 240, 200)
}

/** The settled parts of the map, kept free of scattered trees and bushes. */
export function settledMask(B: Builder): Uint8Array {
  const m = new Uint8Array(B.w * B.h)
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (group(x, y) !== null || (x >= 6 && x <= 44 && y >= 62 && y <= 92)) m[idx(x, y)] = 1
  return m
}

// ---------------------------------------------------------------------------------------------
// Texts
// ---------------------------------------------------------------------------------------------

const FLOWERS = ['red', 'yellow', 'violet', 'white', 'pink']

const FLOWER_TEXT = [
  'Somebody’s flower bed. Weeded this morning, by the look of it, and admired twice since.',
  'Morning glories, trained up a bamboo frame. They open at dawn and close by noon, like a sensible shop.',
  'Bellflowers and pinks. A bee is working through them in strict order.',
  'Marigolds by the door, against bad luck and nosy neighbours. Works on one of them.',
]

const POT_TEXT = [
  'A potted pine, a hundred years old and the size of a cat.',
  'A pot of morning glories. Someone has written its name on the pot: "Hana".',
  'A pot of herbs for the kitchen, slightly nibbled. Not by you. Probably.',
]

const NOTICES = [
  'NOTICE: Lord Oda Nobunaga honours Kyoto with a visit. He stays at Honnō-ji temple with a modest escort.',
  'All is calm in the realm. Nothing could possibly go wrong.',
  'HARBOUR: the master asks that a fast boat be kept ready "for an important guest". He will not say who.',
  'LOST: one sandal, left foot. Answers to "Sanpei’s sandal". Reward: a fish (small).',
  'Market day every third day. Jinbei the peddler brings combs, fans and rumours.',
]

const CONTRACTS = [
  'CONTRACT: A kappa in the manor moat drowns ducks and steals cucumbers. Bring proof (the plate off its head). Reward: three mon and a cucumber. — The Steward',
  'CONTRACT: On the temple mountain at night, something screams like a monkey. Tiger’s legs, snake for a tail. A nue. Reward: prayers. — Kōun-ji',
  'WANTED: Agents of Lord Akechi Mitsuhide, travelling as pilgrims. Recognise them by the bellflower crest, which they will surely be wearing.',
  'CONTRACT: Rats in the fish market. One took a whole bonito and looked Oshio in the eye. Reward: all the fish you can carry. (None.)',
  'CONTRACT: Our ox will not stop staring at the moon. Exorcist wanted. Cheap. — Yasaku',
  'Someone has added, in a child’s hand: "IGA PEOPLE ARE NOT NINJA. — a ninja".',
  'You are a turtle. You decline every contract. You read them all again anyway.',
]

const FISH_TEXT = [
  'A fisherman’s hut. Drying squid hung like laundry, and a grandmother mending a net with her toes.',
  'A hut of salt-grey boards. The door is a net. The net is also the window.',
  'A fisherman’s hut with a fish-shaped weathervane that points, unhelpfully, at the sea.',
]
const WAREHOUSE_TEXT = [
  'A harbour warehouse. Rice from Ise, cotton from Owari, and something marked "DO NOT OPEN (cats)".',
  'Cotton bales from Owari. Soft. You test one with your face. Very soft.',
  'A warehouse of salt fish. The smell has its own weather.',
]
const COTTAGE_TEXT = [
  'A thatched cottage leaning on its neighbour like a friend after the tavern.',
  'A cottage that smells of seaweed and pickles. Someone inside is singing, badly, about the sea.',
  'A cottage with a pumpkin vine climbing onto the roof. The pumpkins have the best view in the village.',
  'A cottage with a sleeping cat on the step and a sleeping grandfather just inside. They have the same expression.',
]
const FARM_TEXT = [
  'A farmhouse. Muddy sandals by the door, a hoe against the wall, and a cat asleep on both.',
  'A thatched farmhouse with smoke leaking through the roof, the way it is supposed to.',
  'A farmhouse. Inside, someone is telling someone else exactly how the rice should have been planted.',
]

