// Kumoi, grown on four pieces of land around a harbour basin (after a hand-drawn port-city map):
//
//   north island   the samurai quarter, and the castle in its own moat on the eastern lobe
//   causeway       a street of houses on a strip of land to the central island, through the Sea Gate
//   central island the merchant city: market square, Oume's teahouse, the Inari shrine, inns and the
//                  brewery along the Willow Canal; the North Gate bridge to the mainland
//   south land     the craftsmen's quarter, and the harbour arm curling round the basin with
//                  warehouses, the fish market, the shipwright and a lighthouse on its tip;
//                  Jōshō-ji at the bottom of the arm; the West Gate bridge to the farms
//   Shiomachi      across the channel, outside the walls: fishermen, net sheds, row houses, docks
//
// Walls with towers follow the coast of the first three; Shiomachi and the harbour fronts have
// quays and piers instead. Streets are grown, not ruled (world/organic.ts).

import { pick, rng, type Rng } from '../engine/rng'
import { idx, isWet, T, type Builder, type Building, type BuildingKind, type Pt } from './layout'
import { bridge, coastWalls, docks, gate, isStreet, lots, prune, scatterPoints, streets, yards, type Waypoint } from './organic'
import { houseLot, kuraLot, lantern, rowLot, shopLot, stallText, type Lot } from './plan'
import { blob, fillPoly, line, waterDistance, type P } from './shape'

export const Z = { north: 1, central: 2, south: 3, shio: 4 } as const

const CENTRAL: P[] = [
  [67, 144], [72, 119], [92, 108], [119, 103], [140, 94], [150, 80], [156, 72], [178, 69], [194, 78], [222, 92], [244, 113], [253, 135],
  [246, 160], [232, 178], [214, 188], [195, 191], [167, 191], [139, 191], [119, 186], [100, 178], [84, 170], [69, 160],
]
const SOUTH: P[] = [
  [31, 163], [24, 180], [20, 200], [22, 220], [30, 236], [44, 249], [64, 258], [90, 262], [120, 262], [150, 258], [180, 250], [196, 240],
  [208, 224], [218, 206], [222, 196], [205, 196], [160, 196], [122, 196], [116, 200], [108, 212], [96, 224], [82, 230], [68, 227], [58, 215],
  [53, 198], [50, 182], [44, 168], [38, 162],
]
const SHIO: P[] = [
  [258, 146], [272, 156], [282, 172], [286, 190], [280, 208], [268, 222], [250, 236], [230, 248], [206, 256], [196, 252], [206, 238],
  [220, 220], [232, 200], [240, 182], [248, 164],
]

/** The market square. */
export const SQUARE = { x: 158, y: 140, rx: 18, ry: 10 }

export interface Kumoi {
  zone: Uint8Array
  hub: Pt
}

export function kumoi(B: Builder): Kumoi {
  const r = rng(1590)
  const zone = new Uint8Array(B.w * B.h)
  const reserved = new Uint8Array(B.w * B.h)
  const mark = (z: number) => (x: number, y: number) => {
    zone[idx(x, y)] = z
  }
  const inZone = (x: number, y: number, ...zs: number[]) => B.inside(x, y) && zs.includes(zone[idx(x, y)]) && !isWet(B.get(x, y))

  // --- land and water ---
  blob(B, 97, 42, 44, 31, T.Plaza, { jitter: 3, seed: 11, each: mark(Z.north) })
  blob(B, 148, 29, 19, 15, T.Plaza, { jitter: 2, seed: 12, each: mark(Z.north) })
  fillPoly(B, CENTRAL, T.Plaza, { jitter: 3, seed: 13, each: mark(Z.central) })
  B.fill(128, 58, 33, 9, T.Plaza)
  B.fill(152, 58, 9, 23, T.Plaza)
  for (let y = 58; y < 81; y++) for (let x = 128; x < 161; x++) if (B.get(x, y) === T.Plaza && !zone[idx(x, y)]) zone[idx(x, y)] = Z.central
  fillPoly(B, SOUTH, T.Plaza, { jitter: 3, seed: 15, each: mark(Z.south) })
  fillPoly(B, SHIO, T.Plaza, { jitter: 3, seed: 16, each: mark(Z.shio) })
  // The Willow Canal between the central island and the south, and the channel to Shiomachi.
  B.fill(110, 192, 115, 4, T.Water)
  // Bits of sea the ragged coasts left either side of the canal are canal too (no walls on it).
  for (let y = 184; y < 204; y++) for (let x = 118; x < 222; x++) if (B.get(x, y) === T.Sea) B.set(x, y, T.Water)
  line(B, [[266, 138], [226, 200], [188, 258]], 6, T.Sea)
  // Islets in the bay.
  blob(B, 40, 136, 3, 2, T.Sand, { jitter: 1, seed: 21 })
  blob(B, 225, 62, 4, 3, T.Sand, { jitter: 1, seed: 22 })

  const waypoints: Waypoint[] = []
  const gateText = (where: string) => [`The ${where}. Iron-studded doors, open from dawn till late.`, 'The guards say it closes at night. The guards are asleep at night.']

  // --- bridges and gates ---
  const north = bridge(B, 246, 92, 246, 126, 4)
  const gN = gate(B, 'gateN', 'North Gate', north.b, 'up', 4, gateText('North Gate'))
  waypoints.push({ ...gN.door, w: 3 })
  B.place('northGateGuard', gN.door.x - 1, gN.door.y, 'down')
  B.place('northRoad', north.a.x + 1, north.a.y, 'up')
  const gS = gate(B, 'gateS', 'Sea Gate', { x: 155, y: 70 }, 'up', 3, gateText('Sea Gate'))
  waypoints.push({ ...gS.door, w: 2 }, { x: 156, y: 62, w: 2 })
  B.place('seaGateGuard', gS.door.x - 1, gS.door.y, 'down')
  B.place('seaGateNight', 156, 68, 'down')
  const west = bridge(B, 100, 250, 100, 284, 4)
  const gW = gate(B, 'gateW', 'West Gate', west.a, 'down', 4, gateText('West Gate'))
  waypoints.push({ ...gW.door, w: 3 })
  B.place('westGateGuard', gW.door.x - 1, gW.door.y, 'down')
  B.place('westRoad', west.b.x + 1, west.b.y, 'down')
  const south = bridge(B, 150, 250, 150, 276, 3)
  const gSo = gate(B, 'gateSouth', 'South Gate', south.a, 'down', 3, gateText('South Gate'))
  waypoints.push({ ...gSo.door, w: 2 })
  B.place('southRoad', south.b.x + 1, south.b.y, 'down')
  const east = bridge(B, 226, 176, 264, 176, 3)
  const gE = gate(B, 'gateE', 'East Gate', east.a, 'right', 3, gateText('East Gate'))
  waypoints.push({ ...gE.door, w: 3 }, { ...east.b, w: 2 })
  B.place('eastGateGuard', gE.door.x, gE.door.y - 1, 'left')
  const shioEast = bridge(B, 278, 189, 306, 189, 3)
  waypoints.push({ ...shioEast.a, w: 2 })
  B.place('eastRoad', shioEast.b.x, shioEast.b.y + 1, 'right')
  const shioSouth = bridge(B, 218, 240, 218, 276, 3)
  waypoints.push({ ...shioSouth.a, w: 2 })
  B.place('hamanaRoad', shioSouth.b.x + 1, shioSouth.b.y, 'down')
  for (const x of [132, 160, 188]) {
    const c = bridge(B, x, 186, x, 201, 3)
    waypoints.push({ ...c.a, w: 2 }, { ...c.b, w: 2 })
  }

  castle(B, waypoints)

  // --- the square and the canal promenades ---
  blob(B, SQUARE.x, SQUARE.y, SQUARE.rx, SQUARE.ry, T.Stone, { jitter: 1, seed: 31, over: [T.Plaza] })
  for (let x = 112; x < 224; x++)
    for (const y of [190, 191, 196, 197]) if (B.get(x, y) === T.Plaza && (zone[idx(x, y)] === Z.central || zone[idx(x, y)] === Z.south)) B.set(x, y, T.Stone)

  // --- named buildings ---
  const N = (spec: Spec, at: Pt, w = 2) => {
    const b = named(B, reserved, (x, y) => !!zone[idx(x, y)], spec, at)
    waypoints.push({ x: b.door.x, y: b.door.y, w })
    return b
  }
  const tea = N({ id: 'teahouse', kind: 'teahouse', name: "Oume's Teahouse", w: 7, h: 6, text: ['The curtain reads: TEA · DANGO · GOSSIP.', 'The gossip is free. The dango is not.'] }, { x: 154, y: 124 }, 3)
  const rice = N({ id: 'riceShop', kind: 'shop', variant: 'rice', name: 'Rihei Rice Merchant', w: 6, h: 5, text: ['Rice bales stacked to the rafters. A sign: "Rice for samurai stipends. And everyone else, at a markup."'] }, { x: 140, y: 126 }, 3)
  const sweets = N({ id: 'sweetShop', kind: 'shop', variant: 'sweets', name: 'Yohei Sweets', w: 6, h: 5, text: ['Sweet bean cakes in the window. The window has nose prints. Children’s. Probably.'] }, { x: 168, y: 126 }, 3)
  const watch = N({ id: 'watchtower', kind: 'watchtower', name: 'Fire watchtower', w: 3, h: 3, ground: [T.Stone], text: ['The fire watchtower. A bell at the top for fires, earthquakes and, once, a very large carp.', 'Climbing is forbidden. Also impossible, for you.'] }, { x: 143, y: 134 })
  const inari = N({ id: 'inari', kind: 'shrine', variant: 'small', name: 'Inari shrine', w: 4, h: 3, text: ['A tiny Inari shrine. Two stone foxes guard it.', 'Someone left fried tofu. The foxes did not eat it. Suspicious foxes.'] }, { x: 184, y: 136 })
  const bath = N({ id: 'bathhouse', kind: 'bathhouse', name: 'Bathhouse', w: 8, h: 6, text: ['The bathhouse. Blue curtain for men, red for women.', 'No sign about turtles. You note that for later.'] }, { x: 114, y: 136 })
  const cloth = N({ id: 'clothShop', kind: 'shop', variant: 'cloth', name: 'Osen Cloth', w: 6, h: 5, text: ['Bolts of indigo and persimmon cloth. One very loud bolt of pink. Osen calls it "bold".'] }, { x: 122, y: 148 })
  const med = N({ id: 'medicine', kind: 'shop', variant: 'medicine', name: 'Sōan Medicines', w: 6, h: 5, text: ['Dried roots, powdered horn, and a jar labelled "do not". Everyone respects the jar.'] }, { x: 132, y: 154 })
  const inn = N({ id: 'inn', kind: 'inn', name: 'Shiokaze Inn', w: 9, h: 6, text: ['The Shiokaze Inn. "Travellers, merchants, pilgrims. Turtles by arrangement."', 'Arrangement not available.'] }, { x: 146, y: 178 })
  const tofu = N({ id: 'tofu', kind: 'shop', variant: 'tofu', name: 'Heikichi Tofu', w: 6, h: 5, text: ['Tubs of tofu in cold water. The tofu maker has been awake since three. It shows.'] }, { x: 160, y: 180 })
  const brew = N({ id: 'brewery', kind: 'brewery', name: 'Kurozaemon Brewery', w: 9, h: 7, text: ['A sign on the door: NO TURTLES.', 'It has a little drawing of a turtle with a line through it. Very specific.'] }, { x: 174, y: 176 }, 3)
  const kuraBrew = N({ id: 'kuraBrew', kind: 'kura', name: 'Brewery storehouse', w: 4, h: 5, text: ['Locked. It smells of sake. Your errand is in there. So close.'] }, { x: 188, y: 178 })
  N({ id: 'doctor', kind: 'machiya', variant: 'doctor', name: 'Doctor’s house', w: 6, h: 5, text: ['The doctor’s house. A sign: "Back soon. If not, boil water anyway."'] }, { x: 132, y: 170 })
  N({ id: 'kuraHarbour', kind: 'kura', name: 'Storehouse', w: 4, h: 5, text: ['A storehouse full of dried fish. You can smell it through the wall. So can every cat in Ise.'] }, { x: 122, y: 178 })
  // North island: samurai houses.
  const sakuma = N({ id: 'samuraiSakuma', kind: 'samurai', name: 'Sakuma residence', w: 9, h: 6, text: ['The Sakuma residence: plaster walls, a pine pruned within an inch of its life.', 'A servant peers out, sees a turtle, and decides it is not their problem.'] }, { x: 82, y: 28 })
  N({ id: 'samuraiIori', kind: 'samurai', name: 'Iori residence', w: 9, h: 6, text: ['The steward Iori’s residence. Ledgers stacked in the window. Even the cat looks audited.'] }, { x: 96, y: 28 })
  // South: craftsmen.
  const smithy = N({ id: 'smithy', kind: 'smithy', name: 'Tetsuzō Forge', w: 6, h: 5, text: ['The forge. It’s hot enough to boil a turtle. Do not lean in.', 'Hammers, tongs, and a half-finished kitchen knife "for a samurai’s wife".'] }, { x: 130, y: 204 })
  const carp = N({ id: 'carpenter', kind: 'workshop', variant: 'carpenter', name: 'Gorō Carpentry', w: 6, h: 5, text: ['Sawdust, planks, and a half-built shrine for somebody’s grandmother.'] }, { x: 142, y: 205 })
  const umb = N({ id: 'umbrella', kind: 'workshop', variant: 'umbrella', name: 'Okane Umbrellas', w: 6, h: 5, text: ['Oiled-paper umbrellas drying open like flowers. The rainy season is good business.'] }, { x: 154, y: 206 })
  N({ id: 'nagayaA', kind: 'nagaya', name: 'Row houses', w: 12, h: 4, text: ['Row houses: thin walls, loud neighbours, and somebody frying fish right now.'] }, { x: 120, y: 214 })
  N({ id: 'nagayaB', kind: 'nagaya', name: 'Row houses', w: 12, h: 4, text: ['Row houses. A baby crying, a cat answering.'] }, { x: 136, y: 222 })
  N({ id: 'nagayaC', kind: 'nagaya', name: 'Row houses', w: 12, h: 4, litHours: [[1080, 1320]], text: ['Row houses. Someone inside is practising the shakuhachi. Badly.'] }, { x: 154, y: 230 })
  N({ id: 'houseHachi', kind: 'machiya', name: 'Townhouse', w: 6, h: 5, text: ['A townhouse. Muddy little footprints lead in, out, and up the wall.'] }, { x: 170, y: 216 })
  const joshoji = N({ id: 'joshoji', kind: 'hondo', name: 'Jōshō-ji', w: 12, h: 7, litHours: [[1080, 1260]], text: ['Jōshō-ji, the harbour temple. Fishermen pray here for calm seas, and their wives for the fishermen to come home sober.', 'The priest says the mountain temple is "for tourists". The mountain temple says nothing. It is up a mountain.'] }, { x: 70, y: 238 }, 3)
  // The harbour arm.
  const ship = N({ id: 'shipwright', kind: 'shipwright', name: 'Shipwright', w: 8, h: 5, text: ['A half-built boat on its frame, like the bones of a whale.', 'Chalked on the hull: "FAST. FOR AN IMPORTANT GUEST. DON’T ASK."'] }, { x: 34, y: 192 })
  const market = N({ id: 'fishmarket', kind: 'fishmarket', name: 'Fish market', w: 10, h: 4, text: ['The fish market. Bonito, sea bream, squid, and a very large tuna nobody can afford.', 'The cats have formed a union.'] }, { x: 34, y: 206 }, 3)
  const tavern = N({ id: 'tavern', kind: 'tavern', name: 'The Drunken Octopus', w: 7, h: 5, text: ['A tavern. Red lanterns, loud sailors, and a sign: "THE DRUNKEN OCTOPUS".', 'The octopus on the sign is, to be fair, drunk.'] }, { x: 36, y: 220 })
  const office = N({ id: 'office', kind: 'shop', variant: 'harbour', name: 'Harbour office', w: 6, h: 5, text: ['The harbour office. A chart of the bay, a tide table, and a list titled "Boats for important guests".'] }, { x: 48, y: 232 })
  const wh = N({ id: 'warehouseE1', kind: 'kura', variant: 'harbour', name: 'Warehouse', w: 7, h: 5, text: ['A warehouse full of rice bales. The rats here are very well fed and very polite.'] }, { x: 34, y: 178 })
  // Shiomachi.
  N({ id: 'nagayaD', kind: 'nagaya', name: 'Row houses', w: 12, h: 4, litHours: [[1080, 1300]], text: ['Row houses. Laundry, cats, children, laundry.'] }, { x: 238, y: 206 })
  N({ id: 'ruin', kind: 'ruin', name: 'Burnt house', w: 6, h: 4, text: ['A burnt-out house. The neighbours say it was a cooking fire. They say it quickly, and look at the castle.', 'Among the ashes: a tea kettle, perfectly fine. Kettles survive everything. Kettles, turtles and cockroaches.'] }, { x: 256, y: 186 })
  const sanpei = N({ id: 'fishhut', kind: 'fishhut', name: "Sanpei's hut", w: 4, h: 4, text: ['A board nailed by the door: "BIGGEST CARP: 3 shaku." Someone has crossed it out and written "1".'] }, { x: 266, y: 200 })
  N({ id: 'fishhut2', kind: 'fishhut', name: 'Fisherfolk hut', w: 4, h: 4, text: ['A net-mender’s hut. Nets inside, nets outside, nets on the roof.'] }, { x: 258, y: 212 })
  N({ id: 'netshed', kind: 'hut', name: 'Net shed', w: 4, h: 4, text: ['A shed of old nets, older ropes, and one ancient boat paddle with teeth marks.'] }, { x: 248, y: 222 })

  // --- walls and docks ---
  const basin = (x: number, y: number) => x >= 42 && x <= 128 && y >= 150 && y <= 246 && !(y > 236 && x < 70)
  const northDocks = (x: number, y: number) => x >= 50 && x <= 76 && y >= 26 && y <= 62
  const tip = (x: number, y: number) => x >= 26 && x <= 46 && y >= 156 && y <= 172
  coastWalls(B, (x, y) => inZone(x, y, Z.north, Z.central, Z.south), (x, y) => basin(x, y) || northDocks(x, y) || tip(x, y), 15)
  const pierRoots = docks(B, r, (x, y) => inZone(x, y, Z.shio) || (inZone(x, y, Z.north, Z.central, Z.south) && (basin(x, y) || northDocks(x, y))), { every: 8, maxLen: 9 })
  for (const p of pierRoots) waypoints.push({ x: p.x, y: p.y, w: 1 })
  const coastDist = waterDistance(B)

  // The lighthouse on the tip of the arm, and the merchant ship in the basin.
  const tipAt = nearestFree(B, { x: 33, y: 165 }, (x, y) => inZone(x, y, Z.south) && B.get(x, y) === T.Plaza)
  B.prop({ kind: 'lighthouse', x: tipAt.x, y: tipAt.y, solid: true, name: 'Lighthouse', text: ['A stone lighthouse on the tip of the harbour arm. A fire burns in it all night.', 'Somebody has to climb up there with oil every evening. That somebody complains a lot.'] })
  const foot = nearestFree(B, { x: tipAt.x + 1, y: tipAt.y + 2 }, (x, y) => inZone(x, y, Z.south) && B.get(x, y) === T.Plaza)
  B.place('lighthouseFoot', foot.x, foot.y, 'up')
  B.place('breakwater', foot.x, foot.y, 'down')
  waypoints.push({ ...foot, w: 1 })
  B.prop({ kind: 'ship', x: 74, y: 186, w: 10, h: 4, solid: true, name: 'Merchant ship', text: ['The merchant ship "Ise Maru". A big square sail, a painted eye on the bow.', 'The eye follows you. It’s just paint. Probably.'] })

  squareProps(B, tea, watch)

  // --- streets ---
  const hub = { x: SQUARE.x, y: SQUARE.y + 2 }
  const ok = (i: number) => zone[i] !== 0 && !isWet(B.tiles[i])
  const scatter = scatterPoints(B, r, (x, y) => !!zone[idx(x, y)] && B.get(x, y) === T.Plaza && coastDist[idx(x, y)] > 2, 9)
  streets(B, r, ok, [{ ...hub, w: 3 }, ...waypoints, ...scatter], { seed: 41, loops: 90, ground: [T.Plaza], coast: coastDist })

  // --- places in the streets ---
  const street = (name: string, x: number, y: number, face: 'down' | 'up' | 'left' | 'right' = 'down', group?: string) => {
    const p = nearestFree(B, { x, y }, (px, py) => isStreet(B.get(px, py)) && !!zone[idx(px, py)])
    if (group) B.spot(group, name, p.x, p.y, face)
    else B.place(name, p.x, p.y, face)
    return p
  }
  const door = (name: string, b: Building, face: 'down' | 'up' | 'left' | 'right' = 'down') => B.place(name, b.door.x, b.door.y, face)
  door('teaCounter', tea)
  door('riceFront', rice)
  door('sweetFront', sweets)
  door('watchtowerFoot', watch)
  door('inariFront', inari, 'up')
  B.place('catInari', inari.door.x + 1, inari.door.y)
  door('bathFront', bath)
  door('clothFront', cloth)
  door('medicineFront', med)
  door('innFront', inn)
  door('tofuFront', tofu)
  door('brewFront', brew)
  door('kuraBrewFront', kuraBrew)
  door('smithyFront', smithy)
  B.place('anvil', smithy.door.x - 1, smithy.door.y, 'up')
  door('carpenterFront', carp)
  door('umbrellaFront', umb)
  door('slipway', ship, 'up')
  door('fishCounter', market)
  B.place('fishCounter2', market.door.x + 1, market.door.y, 'down')
  B.place('catFish', market.door.x - 1, market.door.y)
  door('tavernFront', tavern)
  B.place('tavernIn1', tavern.door.x + 1, tavern.door.y, 'down')
  door('officeFront', office)
  door('warehouseFront', wh)
  door('joshojiFront', joshoji, 'up')
  door('netMend', B.buildings.find((b) => b.id === 'fishhut2')!)
  B.place('quayE', sanpei.door.x, sanpei.door.y, 'down')
  street('samuraiLane', sakuma.door.x + 4, sakuma.door.y + 1, 'right')
  street('mainStreetW', 112, 128, 'right')
  street('mainStreetE', 226, 132, 'left')
  street('southStreetW', 124, 210, 'right')
  street('southStreetE', 196, 214, 'left')
  street('wallLaneW', 60, 200, 'right')
  street('wallLaneE', 240, 150, 'left')
  street('harbourStreet', 44, 214, 'down')
  street('quayW', 46, 190, 'down')
  street('catFish2', market.door.x + 3, market.door.y + 1)
  street('catFish3', market.door.x - 3, market.door.y + 1)
  pierPlaces(B, pierRoots)

  // --- houses ---
  const shioLot = (rr: Rng): Lot => {
    const v = rr()
    if (v < 0.3) return { ...rowLot(rr), w: 10 }
    if (v < 0.55) return { kind: 'fishhut', w: 4, h: 4, name: 'Fisherfolk hut', text: [pick(rr, ['A fisherman’s hut. Drying squid hung like laundry, and a grandmother mending a net with her toes.', 'A hut of salt-grey boards. The door is a net. The net is also the window.'])], home: true }
    if (v < 0.75) return { kind: 'cottage', w: 6, h: 4, name: 'Cottage', text: [pick(rr, ['A thatched cottage leaning on its neighbour like a friend after the tavern.', 'A cottage that smells of seaweed and pickles. Someone inside is singing about the sea, badly.'])], home: true }
    if (v < 0.88) return { kind: 'minkaOld', w: 6, h: 5, name: 'Old house', text: ['An old house with a sagging roof and a very upright old woman on the step.'], home: true }
    return { kind: 'hut', w: 4, h: 4, name: 'Net shed', text: ['A net shed. Inside: nets, floats, and a cat who considers all of it hers.'] }
  }
  const harbourLot = (rr: Rng): Lot => {
    const v = rr()
    if (v < 0.4) return { kind: 'kura', variant: 'harbour', w: 7, h: 5, name: 'Warehouse', text: [pick(rr, ['A harbour warehouse. Rice from Ise, cotton from Owari, and something marked "DO NOT OPEN (cats)".', 'Cotton bales from Owari. Soft. You test one with your face. Very soft.', 'A warehouse of salt fish. The smell has its own weather.'])] }
    if (v < 0.52) return { kind: 'tavern', w: 7, h: 5, name: 'Sailors’ tavern', text: ['A sailors’ tavern. A song about a mermaid, sung by men who have clearly never met one.'] }
    if (v < 0.65) return { kind: 'fishhut', w: 4, h: 4, name: 'Fisherfolk hut', text: ['A fisherman’s hut. Nets inside, nets outside, nets on the roof.'], home: true }
    return rowLot(rr)
  }
  const pool = (x: number, y: number, rr: Rng): Lot | null => {
    const z = zone[idx(x, y)]
    const v = rr()
    if (z === Z.north) return v < 0.5 ? { kind: 'samurai', w: 9, h: 6, name: 'Samurai residence', text: ['A samurai house: plaster walls, a pine pruned within an inch of its life.'] } : v < 0.85 ? houseLot(rr) : kuraLot()
    if (z === Z.central) {
      if (y > 170) return v < 0.18 ? { kind: 'inn', w: 9, h: 5, name: 'Inn', text: ['An inn. Straw sandals lined up at the door: pilgrims, merchants, and one pair of very small ones.'] } : v < 0.38 ? { kind: 'teahouse', w: 7, h: 5, name: 'Teahouse', text: ['A teahouse with red lanterns and a shamisen playing somewhere inside. Slowly. Beautifully.'] } : v < 0.48 ? { kind: 'tavern', w: 7, h: 5, name: 'Sake house', text: ['A sake house. Laughter, a song with more verses than anyone wanted, the clack of dice behind a screen.'] } : houseLot(rr)
      return v < 0.35 ? shopLot(rr) : v < 0.85 ? houseLot(rr) : kuraLot()
    }
    if (z === Z.south) {
      if (x < 66 || y > 236) return harbourLot(rr)
      if (v < 0.35) return rowLot(rr)
      if (v < 0.5) return { kind: 'workshop', variant: pick(rr, ['carpenter', 'umbrella']), w: 6, h: 5, name: 'Workshop', text: ['A workshop. Sawdust, shavings, a tune whistled slightly wrong.'] }
      if (v < 0.58) return { kind: 'smithy', w: 6, h: 5, name: 'Smithy', text: ['A smithy. The ring of hammers, the hiss of quenching, a smith with no eyebrows.'] }
      return houseLot(rr)
    }
    if (z === Z.shio) return shioLot(rr)
    return null
  }
  const group = (x: number, y: number) => {
    const z = zone[idx(x, y)]
    return z === Z.north ? 'samurai' : z === Z.central ? (y > 170 ? 'inns' : 'town') : z === Z.south ? (x < 66 || y > 236 ? 'harbour' : 'crafts') : 'shiomachi'
  }
  lots(B, r, reserved, { ok: (x, y) => !!zone[idx(x, y)], ground: [T.Plaza], pool, group, prefix: 'k' })
  prune(B, hub)
  yards(B, r, hub, reserved, { ok: (x, y) => !!zone[idx(x, y)], ground: [T.Plaza], trees: ['pine', 'maple', 'persimmon', 'broad', 'willow'], garden: 0.35, nook: 0.2 })

  // Willows and lanterns along the canal.
  for (let x = 114; x < 222; x += 6)
    for (const y of [190, 197]) {
      if (B.isTaken(x, y) || B.get(x, y) !== T.Stone) continue
      const near = [B.get(x - 1, y), B.get(x + 1, y)].every((t) => t === T.Stone)
      if (!near) continue
      if ((x / 6) % 2) B.prop({ kind: 'tree', x, y, variant: 'willow', solid: true, name: 'Willow', text: 'A willow trailing its hair in the canal. Poets come here to be sad on purpose.' })
      else lantern(B, x, y)
    }
  for (const [n, x, y] of [
    ['canal1', 140, 191],
    ['canal2', 180, 196],
    ['canal3', 200, 191],
    ['canal4', 124, 196],
  ] as const)
    street(`spot:${n}`, x, y, 'down', 'inns')

  // Areas.
  B.area('square', SQUARE.x - SQUARE.rx, SQUARE.y - SQUARE.ry, SQUARE.rx * 2 + 1, SQUARE.ry * 2 + 1, [T.Stone])
  B.area('teaFront', tea.door.x - 6, tea.door.y, 13, 3, [T.Stone, T.Road])
  B.area('mainStreet', 100, 110, 140, 70, [T.Road])
  B.area('brewYard', brew.door.x - 6, brew.door.y, 13, 3, [T.Road, T.Stone])
  B.area('southStreet', 110, 200, 100, 50, [T.Road])
  B.area('samuraiLane', 56, 12, 74, 60, [T.Road])
  B.area('carpentry', smithy.door.x - 2, smithy.door.y - 2, 32, 8, [T.Road])
  B.area('canal', 110, 192, 115, 4, [T.Water])
  B.area('moat', 110, 192, 115, 4, [T.Water])
  B.area('quay', 20, 150, 110, 100, [T.Stone])
  B.area('harbourStreet', 20, 160, 60, 90, [T.Road])
  B.area('docks', 20, 150, 110, 100, [T.Stone, T.Road, T.Pier])
  B.area('shipwrightYard', ship.door.x - 6, ship.door.y - 1, 13, 5, [T.Plaza, T.Road, T.Stone])
  return { zone, hub }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

interface Spec {
  id: string
  kind: BuildingKind
  variant?: string
  name: string
  w: number
  h: number
  text: string[]
  litHours?: [number, number][]
  ground?: number[]
}

/** Place a named building as close to `at` as it fits, door on open ground below it. */
function named(B: Builder, reserved: Uint8Array, ok: (x: number, y: number) => boolean, s: Spec, at: Pt): Building {
  const ground = new Set(s.ground ?? [T.Plaza])
  const fits = (x: number, y: number) => {
    for (let j = y; j < y + s.h; j++) for (let i = x; i < x + s.w; i++) if (!B.inside(i, j) || !ok(i, j) || !ground.has(B.get(i, j)) || B.isTaken(i, j) || reserved[idx(i, j)]) return false
    const dx = x + Math.floor(s.w / 2)
    const dy = y + s.h
    const dt = B.get(dx, dy)
    return ok(dx, dy) && !B.isTaken(dx, dy) && (dt === T.Plaza || dt === T.Stone || dt === T.Road || dt === T.Gravel) && !reserved[idx(dx, dy)]
  }
  for (let rad = 0; rad < 24; rad++)
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue
        const x = at.x + dx
        const y = at.y + dy
        if (!fits(x, y)) continue
        const b = B.building({ id: s.id, kind: s.kind, variant: s.variant, name: s.name, x, y, w: s.w, h: s.h, doorX: x + Math.floor(s.w / 2), text: s.text, litHours: s.litHours })
        for (let i = -1; i <= 1; i++) reserved[idx(b.door.x + i, b.door.y)] = 1
        return b
      }
  throw new Error(`no room for ${s.id} near ${at.x},${at.y}`)
}

const nearestFreeAll = (B: Builder, at: Pt, ok: (x: number, y: number) => boolean) => nearestFree(B, at, ok)

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

/** The castle on the north island's eastern lobe: a moat, white walls, the keep, stable, barracks. */
function castle(B: Builder, waypoints: Waypoint[]): void {
  const x0 = 133
  const y0 = 14
  const x1 = 165
  const y1 = 40
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x === x0 || x === x1 || y === y0 || y === y1) B.set(x, y, T.Water)
  B.fill(x0 + 1, y0 + 1, x1 - x0 - 1, y1 - y0 - 1, T.Gravel)
  gate(B, 'gateCastle', 'Castle Gate', { x: x0, y: 26 }, 'left', 2, ['The castle gate. Two very straight guards could stand here.', 'Today there is one slightly bent guard and a cat.'], 'inner')
  const text = 'The castle’s inner wall. Higher and whiter than the town’s. Lords like white.'
  for (let y = y0 + 1; y < y1; y++)
    for (let x = x0 + 1; x < x1; x++) {
      if (x !== x0 + 1 && x !== x1 - 1 && y !== y0 + 1 && y !== y1 - 1) continue
      if (!B.isTaken(x, y) && B.get(x, y) !== T.Stone) B.prop({ kind: 'wall', x, y, solid: true, name: 'Castle wall', text })
    }
  B.building({ id: 'castle', kind: 'castle', name: 'Kumoi Castle', x: 142, y: 18, w: 13, h: 9, doorX: 148, litHours: [[1080, 1380]], text: ['Kumoi Castle. Five roofs, two golden fish on top, one lord who is never home.', 'The steward says the lord is "in Kyoto, with Lord Nobunaga". Must be nice.'] })
  const stable = B.building({ id: 'stable', kind: 'workshop', variant: 'stable', name: 'Castle stable', x: 155, y: 31, w: 6, h: 4, doorX: 157, text: 'The castle stable. One horse. It looks at you as if you are the slowest thing it has ever seen. It is right.' })
  B.building({ id: 'barracks', kind: 'nagaya', name: 'Barracks', x: 136, y: 31, w: 12, h: 4, doorX: 141, litHours: [[1080, 1320]], text: 'The barracks. Forty straw mats, forty pairs of sandals, one smell.' })
  B.building({ id: 'castleKura', kind: 'kura', name: 'Castle storehouse', x: 158, y: 18, w: 4, h: 5, doorX: 159, text: 'The castle’s rice store. Guarded by two spearmen and, more effectively, by the cat.' })
  for (const [x, y, k] of [
    [137, 19, 'pine'],
    [139, 24, 'maple'],
    [162, 26, 'pine'],
  ] as const)
    B.prop({ kind: 'tree', x, y, variant: k, solid: true })
  for (const [x, y] of [
    [145, 29],
    [152, 29],
    [145, 37],
    [152, 37],
  ])
    lantern(B, x, y)
  B.place('castleGateGuard', x0 - 1, 26, 'right')
  B.place('castleYard', 149, 33, 'down')
  B.place('castleSteps', 149, 28, 'down')
  B.place('stableFront', stable.door.x, stable.door.y, 'down')
  B.area('castleYard', x0 + 2, y0 + 2, x1 - x0 - 3, y1 - y0 - 3, [T.Gravel])
  B.area('moatSouth', x0, y0, x1 - x0 + 1, y1 - y0 + 1, [T.Water])
  waypoints.push({ x: x0 - 1, y: 26, w: 2 }, { x: x0 + 3, y: 27, w: 2 }, { x: 148, y: 28, w: 2 }, { x: 141, y: 35, w: 1 }, { x: 157, y: 35, w: 1 }, { x: 159, y: 23, w: 1 })
}

/** Market stalls, benches, boards, trees and lanterns on the square, and its named places. */
function squareProps(B: Builder, tea: Building, watch: Building): void {
  const S = SQUARE
  const placeAt = () => new Set(Object.values(B.places).map((p) => idx(p.x, p.y)))
  const stone = (x: number, y: number, w = 1) => {
    const used = placeAt()
    for (let i = 0; i < w; i++) if (B.get(x + i, y) !== T.Stone || B.isTaken(x + i, y) || used.has(idx(x + i, y))) return false
    return B.get(x, y - 1) === T.Stone && !B.isTaken(x, y - 1)
  }
  // Every other prop on the square avoids the places people stand.
  const nearestFree = (_: Builder, at: Pt, ok: (x: number, y: number) => boolean) => {
    const used = placeAt()
    return nearestFreeAll(B, at, (x, y) => ok(x, y) && !used.has(idx(x, y)) && !used.has(idx(x + 1, y)))
  }
  const VARIANTS = ['fish', 'veg', 'pots', 'fans'] as const
  const NAMED = ['fishStall', 'vegStall', 'fanStall', 'potStall', 'vegStall2']
  let n = 0
  let k = 0
  for (const dy of [-3, 3])
    for (let dx = -14; dx <= 13; dx += 4) {
      if (Math.abs(dx + 1) < 3) continue
      const x = S.x + dx
      const y = S.y + dy
      if (!stone(x, y, 2)) continue
      const v = VARIANTS[k++ % 4]
      B.prop({ kind: 'stall', x, y, w: 2, variant: v, solid: true, name: 'Market stall', text: stallText(v) })
      const name = NAMED.shift()
      if (name) B.place(name, x, y - 1, 'down')
      else B.spot('stalls', `stall:${++n}`, x, y - 1, 'down')
    }
  const put = (name: string, x: number, y: number, face: 'down' | 'up' = 'down') => {
    const p = nearestFree(B, { x, y }, (px, py) => B.get(px, py) === T.Stone)
    B.place(name, p.x, p.y, face)
    return p
  }
  put('stall', S.x + 1, S.y + 6)
  const ft = nearestFree(B, { x: S.x - 8, y: S.y + 7 }, (x, y) => B.get(x, y) === T.Stone && B.get(x, y - 1) === T.Stone && !B.isTaken(x, y - 1))
  B.prop({ kind: 'table', x: ft.x, y: ft.y, solid: true, name: 'Fortune table', text: 'A fortune teller’s table: bamboo sticks, a cracked bowl, and a sign: "THE FUTURE. Cheap."' })
  B.place('fortune', ft.x, ft.y - 1, 'down')
  // Oume's benches in front of the teahouse.
  const benches: [number, string[]][] = [
    [-4, ['teaBench1', 'teaBench2']],
    [2, ['teaBench3', 'teaBench4']],
  ]
  for (const [dx, names] of benches) {
    const p = nearestFree(B, { x: tea.door.x + dx, y: tea.door.y + 2 }, (x, y) => B.get(x, y) === T.Stone && B.get(x + 1, y) === T.Stone && !B.isTaken(x + 1, y))
    B.prop({ kind: 'bench', x: p.x, y: p.y, w: 2, variant: dx < 0 ? 'parasol' : undefined, solid: false, name: 'Bench', text: dx < 0 ? 'A teahouse bench under a red parasol. The red felt is warm from the sun.' : 'A teahouse bench. Someone left a dango skewer. Heisuke, probably.' })
    B.place(names[0], p.x, p.y, 'down')
    B.place(names[1], p.x + 1, p.y, 'down')
  }
  B.place('catTea', tea.door.x - 1, tea.door.y)
  const nob = nearestFree(B, { x: tea.door.x + 6, y: tea.door.y + 1 }, (x, y) => B.get(x, y) === T.Stone)
  B.prop({ kind: 'nobori', x: nob.x, y: nob.y, solid: true, name: 'Banner', text: 'A banner: 茶 (tea). Flapping like it’s proud of it.' })
  const bench = nearestFree(B, { x: S.x - 12, y: S.y + 7 }, (x, y) => B.get(x, y) === T.Stone && B.get(x + 1, y) === T.Stone && !B.isTaken(x + 1, y))
  B.prop({ kind: 'bench', x: bench.x, y: bench.y, w: 2, solid: false, name: 'Bench', text: 'A stone bench, worn smooth by a hundred years of gossip.' })
  B.place('squareBench1', bench.x, bench.y, 'down')
  B.place('squareBench2', bench.x + 1, bench.y, 'down')
  const well = nearestFree(B, { x: S.x + 12, y: S.y + 6 }, (x, y) => B.get(x, y) === T.Stone && B.get(x, y + 1) === T.Stone)
  B.prop({ kind: 'well', x: well.x, y: well.y, solid: true, name: 'Well', text: 'You look down the well. A turtle looks back up. Handsome fellow.' })
  B.place('squareWell', well.x, well.y + 1, 'up')
  B.place('catWell', well.x + 1, well.y + 1)
  const board = (x: number, y: number, variant: string | undefined, text: string[], name: string) => {
    const p = nearestFree(B, { x, y }, (px, py) => B.get(px, py) === T.Stone && B.get(px + 1, py) === T.Stone && !B.isTaken(px + 1, py) && B.get(px, py + 1) === T.Stone)
    B.prop({ kind: 'board', x: p.x, y: p.y, w: 2, variant, solid: true, name, text })
    return p
  }
  const nb = board(S.x - 14, S.y + 3, undefined, NOTICES, 'Notice board')
  B.place('notice', nb.x + 1, nb.y + 1, 'up')
  board(S.x + 14, S.y - 1, 'contracts', CONTRACTS, 'Contracts')
  const camphor = nearestFree(B, { x: S.x + 15, y: S.y - 5 }, (x, y) => B.get(x, y) === T.Stone && B.get(x, y + 1) === T.Stone)
  B.prop({ kind: 'tree', x: camphor.x, y: camphor.y, variant: 'sacred', solid: true, name: 'Old camphor', text: 'The square’s old camphor tree. Everyone meets "under the camphor". Everyone is late.' })
  B.place('camphor', camphor.x, camphor.y + 1, 'up')
  put('beggarSpot', S.x - 2, S.y + 9)
  for (const [x, y] of [
    [S.x - 16, S.y],
    [S.x + 9, S.y + 8],
    [S.x - 6, S.y - 8],
  ]) {
    const p = nearestFree(B, { x, y }, (px, py) => B.get(px, py) === T.Stone)
    B.prop({ kind: 'tree', x: p.x, y: p.y, variant: 'pine', solid: true, name: 'Pine', text: 'A pine pruned into clouds. The gardener visits weekly and argues with it.' })
  }
  for (const [dx, dy] of [
    [-17, -4],
    [17, 4],
    [-10, 9],
    [10, -9],
  ]) {
    const p = nearestFree(B, { x: S.x + dx, y: S.y + dy }, (px, py) => B.get(px, py) === T.Stone)
    lantern(B, p.x, p.y)
  }
  const kago = nearestFree(B, { x: S.x + 6, y: S.y - 7 }, (x, y) => B.get(x, y) === T.Stone && B.get(x + 1, y) === T.Stone && !B.isTaken(x + 1, y))
  B.prop({ kind: 'kago', x: kago.x, y: kago.y, w: 2, solid: true, name: 'Palanquin', text: ['A palanquin, waiting for someone important.', 'The bearers are at the teahouse. The important person is also at the teahouse.'] })
  void watch
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const p = nearestFree(B, { x: Math.round(S.x + Math.cos(a) * S.rx * 0.6), y: Math.round(S.y + Math.sin(a) * S.ry * 0.6) }, (x, y) => B.get(x, y) === T.Stone)
    B.spot('town', `spot:sq${i}`, p.x, p.y, 'down')
  }
}

/** Name a few of the generated piers for the cast: west and middle of the basin, Shiomachi. */
function pierPlaces(B: Builder, roots: Pt[]): void {
  const end = (p: Pt) => {
    // Walk out along the pier.
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      let k = 0
      while (B.get(p.x + dx * (k + 1), p.y + dy * (k + 1)) === T.Pier) k++
      if (k > 1) return { tip: { x: p.x + dx * k, y: p.y + dy * k }, base: { x: p.x + dx, y: p.y + dy } }
    }
    return null
  }
  const nearest = (x: number, y: number) => {
    let best: { tip: Pt; base: Pt } | null = null
    let bd = Infinity
    for (const p of roots) {
      const e = end(p)
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (e && d < bd) [best, bd] = [e, d]
    }
    return best!
  }
  const w = nearest(55, 180)
  B.place('pierW', w.tip.x, w.tip.y, 'down')
  const m = nearest(86, 196)
  B.place('pierMid', m.tip.x, m.tip.y, 'down')
  B.place('pierMidFoot', m.base.x, m.base.y, 'down')
  B.place('shipSide', m.base.x, m.base.y, 'up')
  const e = nearest(286, 196)
  B.place('pierE', e.tip.x, e.tip.y, 'down')
  for (const [n, x, y] of [
    ['h1', 60, 175],
    ['h2', 100, 205],
    ['h3', 270, 170],
    ['h4', 240, 240],
  ] as const) {
    const p = nearest(x, y)
    B.spot(n === 'h3' || n === 'h4' ? 'shiomachi' : 'harbour', `spot:${n}`, p.tip.x, p.tip.y, 'down')
  }
}

const NOTICES = [
  'NOTICE: Lord Oda Nobunaga honours Kyoto with a visit. He stays at Honnō-ji temple with a modest escort.',
  'All is calm in the realm. Nothing could possibly go wrong.',
  'HARBOUR: the master asks that a fast boat be kept ready "for an important guest". He will not say who.',
  'LOST: one sandal, left foot. Answers to "Sanpei’s sandal". Reward: a fish (small).',
  'Market day every third day. Jinbei the peddler brings combs, fans and rumours.',
]

const CONTRACTS = [
  'CONTRACT: A kappa in the castle moat drowns ducks and steals cucumbers. Bring proof (the plate off its head). Reward: three mon and a cucumber. — The Steward',
  'CONTRACT: On the temple mountain at night, something screams like a monkey. Tiger’s legs, snake for a tail. A nue. Reward: prayers. — Kōun-ji',
  'WANTED: Agents of Lord Akechi Mitsuhide, travelling as pilgrims. Recognise them by the bellflower crest, which they will surely be wearing.',
  'CONTRACT: Rats in the fish market. One took a whole bonito and looked Oshio in the eye. Reward: all the fish you can carry. (None.)',
  'CONTRACT: Our ox will not stop staring at the moon. Exorcist wanted. Cheap. — Yasaku',
  'Someone has added, in a child’s hand: "IGA PEOPLE ARE NOT NINJA. — a ninja".',
  'You are a turtle. You decline every contract. You read them all again anyway.',
]
