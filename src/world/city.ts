// The walled city of Kumoi. Coordinates are tiles.
//
//   x  49–235, y 85–167 inside the walls; the grand avenue (x 140–143, paved) runs North Gate → Sea
//   Gate and main street (y 124–127) West Gate → East Gate. They cross at the town square.
//
//   NW  samurai residences (y 87–100), then the merchant quarter in three streets down to main street
//   NE  shops and Oume's teahouse facing the square; the Inari shrine; the castle in its own moat
//   SW  craftsmen's quarter: six streets of workshops and row houses, alleys, a neighbourhood temple
//   SE  inns, the brewery, and the Willow Canal with its teahouses and bridges

import { rng } from '../engine/rng'
import { Builder, T, type TreeKind } from './layout'
import { AVE_X, band, front, lantern, MAIN_Y, POOLS, rect, stallText, WX0, WX1, WY0, WY1 } from './plan'

const r = rng(1600)

export function city(B: Builder): void {
  streets(B)
  walls(B)
  square(B)
  northwest(B)
  northeast(B)
  castle(B)
  southwest(B)
  southeast(B)
  gardens(B)
}

/** Lanes inside the walls, the avenue, main street and the quarter streets. */
function streets(B: Builder): void {
  const road = (x: number, y: number, w: number, h: number) => B.fill(x, y, w, h, T.Road)
  road(52, WY0 + 1, 134, 1) // north wall lane (stops at the castle moat)
  road(52, WY1 - 2, 181, 2) // south wall lane
  road(WX0 + 1, 88, 1, 77) // west wall lane
  road(WX1 - 1, 128, 1, 37) // east wall lane, south of the castle
  road(WX0 + 1, MAIN_Y, WX1 - WX0 - 1, 4) // main street

  // NW: samurai lane, upper street, lantern alley, merchant street.
  road(50, 93, 136, 2)
  road(50, 101, 68, 2)
  road(50, 108, 66, 1)
  road(50, 114, 66, 3)
  // North-south lanes in the north half.
  for (const x of [72, 128, 154, 185]) road(x, 86, 1, 38)
  road(94, 86, 2, 38)
  road(116, 86, 2, 38)
  road(167, 102, 18, 1)

  // SW: craftsmen's row, a narrow street, south street, another, the lower street.
  road(50, 134, 90, 2)
  road(50, 141, 90, 1)
  road(50, 147, 90, 2)
  road(50, 154, 90, 1)
  road(50, 160, 90, 2)
  for (const x of [72, 117, 130]) road(x, 128, 1, 38)
  road(94, 128, 2, 38)

  // SE: inn street, a narrow street, the canal walks, the lower street.
  road(144, 135, 91, 2)
  road(144, 142, 91, 1)
  B.fill(146, 148, 89, 2, T.Stone)
  B.fill(150, 150, 82, 3, T.Water)
  B.fill(146, 153, 89, 2, T.Stone)
  road(144, 160, 91, 2)
  for (const x of [160, 180, 200, 220]) {
    road(x, 128, 2, 20)
    B.fill(x, 150, 2, 3, T.Bridge)
    road(x, 155, 2, 11)
  }
  B.fill(AVE_X, WY0 + 1, 4, WY1 - WY0 - 1, T.Stone) // the grand avenue, paved
}

function walls(B: Builder): void {
  const towers = [
    { id: 'towerNW', x: WX0, y: WY0 },
    { id: 'towerNE', x: WX1 - 3, y: WY0 },
    { id: 'towerSW', x: WX0, y: WY1 - 3 },
    { id: 'towerSE', x: WX1 - 3, y: WY1 - 3 },
  ]
  for (const t of towers)
    B.building({
      id: t.id,
      kind: 'tower',
      name: 'Corner tower',
      x: t.x,
      y: t.y,
      w: 4,
      h: 4,
      door: { x: t.x + (t.x === WX0 ? 4 : -1), y: t.y + (t.y === WY0 ? 4 : 1) },
      text: 'A corner tower. Archers watch the sea from up there. Mostly they watch the fish market.',
      litHours: [[1110, 1350]],
    })
  const gateText = (where: string) => [`The ${where}. Iron-studded doors, open from dawn till late.`, 'The guards say it closes at night. The guards are asleep at night.']
  B.building({ id: 'gateN', kind: 'gate', name: 'North Gate', x: AVE_X - 2, y: WY0 - 1, w: 8, h: 3, door: { x: AVE_X + 1, y: WY0 + 3 }, open: rect(AVE_X, WY0 - 1, 4, 3), text: gateText('North Gate') })
  B.building({ id: 'gateS', kind: 'gate', variant: 'sea', name: 'Sea Gate', x: AVE_X - 2, y: WY1 - 1, w: 8, h: 3, door: { x: AVE_X + 1, y: WY1 + 3 }, open: rect(AVE_X, WY1 - 1, 4, 3), text: gateText('Sea Gate') })
  B.building({ id: 'gateW', kind: 'gateSide', name: 'West Gate', x: WX0 - 1, y: MAIN_Y - 2, w: 3, h: 6, door: { x: WX0 + 2, y: MAIN_Y + 1 }, open: rect(WX0 - 1, MAIN_Y + 1, 3, 2), text: gateText('West Gate') })
  B.building({ id: 'gateE', kind: 'gateSide', name: 'East Gate', x: WX1 - 1, y: MAIN_Y - 2, w: 3, h: 6, door: { x: WX1 - 2, y: MAIN_Y + 1 }, open: rect(WX1 - 1, MAIN_Y + 1, 3, 2), text: gateText('East Gate') })
  const wallText = 'The town wall: river stones below, white plaster above, clay tiles on top. Turtles: not allowed over.'
  const wall = (x: number, y: number) => {
    if (!B.isTaken(x, y)) B.prop({ kind: 'wall', x, y, solid: true, name: 'Town wall', text: wallText })
  }
  for (let x = WX0; x <= WX1; x++) {
    wall(x, WY0)
    wall(x, WY1)
  }
  for (let y = WY0; y <= WY1; y++) {
    wall(WX0, y)
    wall(WX1, y)
  }
  B.place('northGateGuard', AVE_X, WY0 + 4, 'down')
  B.place('seaGateGuard', AVE_X, WY1 - 3, 'down')
  B.place('westGateGuard', WX0 + 3, MAIN_Y, 'right')
  B.place('eastGateGuard', WX1 - 3, MAIN_Y, 'left')
  B.place('wallLaneW', 60, WY1 - 2, 'right')
  B.place('wallLaneE', 225, WY1 - 2, 'left')
  B.place('mainStreetW', 56, MAIN_Y + 2, 'right')
  B.place('mainStreetE', 228, MAIN_Y + 2, 'left')
  B.area('mainStreet', WX0 + 1, MAIN_Y, WX1 - WX0 - 1, 4, [T.Road])
  B.area('avenue', AVE_X, WY0 + 1, 4, WY1 - WY0 - 1, [T.Stone])
}

// ---------------------------------------------------------------------------------------------
// The town square (x 118–166, y 102–123): stalls, the watchtower, Oume's benches, the notice boards
// ---------------------------------------------------------------------------------------------

function square(B: Builder): void {
  B.fill(118, 102, 49, 22, T.Stone)
  B.area('square', 118, 102, 49, 22, [T.Stone])
  B.area('teaFront', 144, 103, 12, 3, [T.Stone])

  B.building({ id: 'watchtower', kind: 'watchtower', name: 'Fire watchtower', x: 119, y: 103, w: 3, h: 3, doorX: 120, text: ['The fire watchtower. A bell at the top for fires, earthquakes and, once, a very large carp.', 'Climbing is forbidden. Also impossible, for you.'] })
  B.place('watchtowerFoot', 121, 107, 'down')
  B.prop({ kind: 'tree', x: 164, y: 105, variant: 'sacred', solid: true, name: 'Old camphor', text: 'The square’s old camphor tree. Everyone meets "under the camphor". Everyone is late.' })
  B.place('camphor', 164, 107, 'up')
  B.prop({ kind: 'bench', x: 145, y: 104, w: 2, variant: 'parasol', solid: true, npcSolid: false, name: 'Bench', text: 'A teahouse bench under a red parasol. The red felt is warm from the sun.' })
  B.prop({ kind: 'bench', x: 151, y: 104, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A teahouse bench. Someone left a dango skewer. Heisuke, probably.' })
  B.place('teaBench1', 145, 104, 'down')
  B.place('teaBench2', 146, 104, 'down')
  B.place('teaBench3', 151, 104, 'down')
  B.place('teaBench4', 152, 104, 'down')
  B.prop({ kind: 'nobori', x: 155, y: 103, solid: true, name: 'Banner', text: 'A banner: 茶 (tea). Flapping like it’s proud of it.' })
  B.prop({ kind: 'nobori', x: 157, y: 103, solid: true, name: 'Banner', text: 'A banner: 団子 (dango). It flaps slightly harder than the tea banner. Rivalry.' })
  // The market: two rows of stalls either side of the avenue. Stallholders stand behind (north of) them.
  const VARIANTS = ['fish', 'veg', 'pots', 'fans'] as const
  const NAMED: Record<string, string> = { '122,108': 'fishStall', '126,108': 'vegStall', '154,108': 'fanStall', '158,108': 'potStall', '122,114': 'vegStall2' }
  let n = 0
  for (const y of [108, 114])
    for (const x of [122, 126, 130, 134, 146, 150, 154, 158]) {
      const v = VARIANTS[(x / 2 + y) % 4]
      const named = NAMED[`${x},${y}`]
      B.prop({ kind: 'stall', x, y, w: 2, variant: named === 'fishStall' ? 'fish' : named?.startsWith('veg') ? 'veg' : named === 'fanStall' ? 'fans' : named === 'potStall' ? 'pots' : v, solid: true, name: 'Market stall', text: stallText(v) })
      if (named) B.place(named, x, y - 1, 'down')
      else B.spot('stalls', `stall:${++n}`, x, y - 1, 'down')
    }
  B.place('stall', 137, 119, 'down')
  B.prop({ kind: 'table', x: 127, y: 119, solid: true, name: 'Fortune table', text: 'A fortune teller’s table: bamboo sticks, a cracked bowl, and a sign: "THE FUTURE. Cheap."' })
  B.place('fortune', 127, 118, 'down')
  B.prop({ kind: 'well', x: 157, y: 120, solid: true, name: 'Well', text: 'You look down the well. A turtle looks back up. Handsome fellow.' })
  B.place('squareWell', 157, 121, 'up')
  B.place('catWell', 158, 121)
  B.prop({
    kind: 'board',
    x: 120,
    y: 121,
    w: 2,
    solid: true,
    name: 'Notice board',
    text: [
      'NOTICE: Lord Oda Nobunaga honours Kyoto with a visit. He stays at Honnō-ji temple with a modest escort.',
      'All is calm in the realm. Nothing could possibly go wrong.',
      'HARBOUR: the master asks that a fast boat be kept ready "for an important guest". He will not say who.',
      'LOST: one sandal, left foot. Answers to "Sanpei’s sandal". Reward: a fish (small).',
      'Market day every third day. Jinbei the peddler brings combs, fans and rumours.',
    ],
  })
  B.place('notice', 121, 122, 'up')
  B.prop({
    kind: 'board',
    variant: 'contracts',
    x: 162,
    y: 121,
    w: 2,
    solid: true,
    name: 'Contracts',
    text: [
      'CONTRACT: A kappa in the castle moat drowns ducks and steals cucumbers. Bring proof (the plate off its head). Reward: three mon and a cucumber. — The Steward',
      'CONTRACT: On the temple mountain at night, something screams like a monkey. Tiger’s legs, snake for a tail. A nue. Reward: prayers. — Kōun-ji',
      'WANTED: Agents of Lord Akechi Mitsuhide, travelling as pilgrims. Recognise them by the bellflower crest, which they will surely be wearing.',
      'CONTRACT: Rats in the fish market. One took a whole bonito and looked Oshio in the eye. Reward: all the fish you can carry. (None.)',
      'CONTRACT: Our ox will not stop staring at the moon. Exorcist wanted. Cheap. — Yasaku',
      'Someone has added, in a child’s hand: "IGA PEOPLE ARE NOT NINJA. — a ninja".',
      'You are a turtle. You decline every contract. You read them all again anyway.',
    ],
  })
  B.prop({ kind: 'bench', x: 126, y: 121, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A stone bench, worn smooth by a hundred years of gossip.' })
  B.place('squareBench1', 126, 121, 'down')
  B.place('squareBench2', 127, 121, 'down')
  B.place('beggarSpot', 138, 122, 'down')
  for (const [x, y] of [
    [136, 105],
    [134, 121],
    [151, 121],
    [119, 113],
    [165, 113],
  ])
    B.prop({ kind: 'tree', x, y, variant: 'pine', solid: true, name: 'Pine', text: 'A pine pruned into clouds. The gardener visits weekly and argues with it.' })
  B.prop({ kind: 'cart', x: 119, y: 118, w: 2, solid: true, name: 'Handcart', text: 'A handcart loaded with radishes. One wheel is slightly smaller. It’s Yasaku’s.' })
  B.prop({ kind: 'kago', x: 160, y: 105, w: 2, solid: true, name: 'Palanquin', text: ['A palanquin, waiting for someone important.', 'The bearers are at the teahouse. The important person is also at the teahouse.'] })
  B.prop({ kind: 'cart', x: 160, y: 122, w: 2, variant: 'barrels', solid: true, name: 'Handcart', text: 'A cart of sake barrels. Kurozaemon has counted them. Twice. He’s watching you.' })
  for (const y of [104, 112, 120]) {
    lantern(B, AVE_X - 1, y)
    lantern(B, AVE_X + 4, y)
  }
  for (const [x, y] of [
    [118, 102],
    [166, 102],
    [118, 123],
    [166, 123],
  ])
    lantern(B, x, y)
  // Spots for passers-by.
  for (const [n, x, y] of [
    ['sq1', 130, 104],
    ['sq2', 150, 110],
    ['sq3', 124, 111],
    ['sq4', 160, 116],
    ['sq5', 146, 119],
    ['sq6', 130, 122],
    ['sq7', 138, 108],
    ['sq8', 162, 104],
    ['sq9', 132, 116],
    ['sq10', 156, 111],
  ] as const)
    B.spot('town', `spot:${n}`, x, y, 'down')
}

// ---------------------------------------------------------------------------------------------
// North-west: samurai residences, then the merchant quarter
// ---------------------------------------------------------------------------------------------

function northwest(B: Builder): void {
  const sakuma = B.building({ id: 'samuraiSakuma', kind: 'samurai', name: 'Sakuma residence', x: 52, y: 87, w: 9, h: 6, doorX: 56, text: ['The Sakuma residence: plaster walls, a pine pruned within an inch of its life.', 'A servant peers out, sees a turtle, and decides it is not their problem.'] })
  B.building({ id: 'samuraiIori', kind: 'samurai', name: 'Iori residence', x: 62, y: 87, w: 9, h: 6, doorX: 66, text: ['The steward Iori’s residence. Ledgers stacked in the window. Even the cat looks audited.'] })
  front(B, 'samuraiLane', sakuma, 3, 1, 'right')
  B.area('samuraiLane', 50, 93, 66, 2, [T.Road])
  const lanes = [72, 94, 95, 116, 117]
  band(B, r, { x0: 50, x1: 139, bottom: 92, maxH: 6, pool: POOLS.samurai, group: 'samurai', gap: 0.7, skip: [...lanes, 128] })
  band(B, r, { x0: 50, x1: 115, bottom: 100, maxH: 6, pool: POOLS.samurai, group: 'samurai', gap: 0.6, skip: lanes })

  // Merchant quarter facing main street.
  const bath = B.building({ id: 'bathhouse', kind: 'bathhouse', name: 'Bathhouse', x: 52, y: 118, w: 8, h: 6, doorX: 55, text: ['The bathhouse. Blue curtain for men, red for women.', 'No sign about turtles. You note that for later.'] })
  const cloth = B.building({ id: 'clothShop', kind: 'shop', variant: 'cloth', name: 'Osen Cloth', x: 62, y: 119, w: 6, h: 5, doorX: 64, text: 'Bolts of indigo and persimmon cloth. One very loud bolt of pink. Osen calls it "bold".' })
  const med = B.building({ id: 'medicine', kind: 'shop', variant: 'medicine', name: 'Sōan Medicines', x: 74, y: 119, w: 6, h: 5, doorX: 76, text: 'Dried roots, powdered horn, and a jar labelled "do not". Everyone respects the jar.' })
  front(B, 'bathFront', bath, 1, 1)
  front(B, 'clothFront', cloth, 0, 1)
  front(B, 'medicineFront', med, 0, 1)
  band(B, r, { x0: 50, x1: 115, bottom: 107, maxH: 5, pool: POOLS.merchant, group: 'town', skip: lanes })
  band(B, r, { x0: 50, x1: 115, bottom: 113, maxH: 5, pool: POOLS.merchant, group: 'town', skip: lanes })
  band(B, r, { x0: 50, x1: 115, bottom: 123, maxH: 5, pool: POOLS.merchant, group: 'town', skip: lanes, gap: 0.15 })
}

// ---------------------------------------------------------------------------------------------
// North-east: shops facing the square, Oume's teahouse, the Inari shrine
// ---------------------------------------------------------------------------------------------

function northeast(B: Builder): void {
  const rice = B.building({ id: 'riceShop', kind: 'shop', variant: 'rice', name: 'Rihei Rice Merchant', x: 119, y: 97, w: 6, h: 5, doorX: 121, text: 'Rice bales stacked to the rafters. A sign: "Rice for samurai stipends. And everyone else, at a markup."' })
  const sweets = B.building({ id: 'sweetShop', kind: 'shop', variant: 'sweets', name: 'Yohei Sweets', x: 130, y: 97, w: 6, h: 5, doorX: 132, text: 'Sweet bean cakes in the window. The window has nose prints. Children’s. Probably.' })
  const tea = B.building({ id: 'teahouse', kind: 'teahouse', name: "Oume's Teahouse", x: 146, y: 96, w: 7, h: 6, doorX: 149, text: ['The curtain reads: TEA · DANGO · GOSSIP.', 'The gossip is free. The dango is not.'] })
  front(B, 'riceFront', rice, 1, 1)
  front(B, 'sweetFront', sweets, 1, 1)
  front(B, 'teaCounter', tea, 0, 1)
  B.place('catTea', 147, 103)
  const lanes = [128, 154, 185]
  band(B, r, { x0: 118, x1: 184, bottom: 92, maxH: 5, pool: POOLS.merchant, group: 'town', skip: [...lanes, AVE_X, AVE_X + 1, AVE_X + 2, AVE_X + 3] })
  band(B, r, { x0: 118, x1: 184, bottom: 101, maxH: 6, pool: POOLS.merchant, group: 'town', skip: [...lanes, AVE_X, AVE_X + 1, AVE_X + 2, AVE_X + 3], gap: 0.1 })

  // The Inari shrine east of the square.
  B.fill(167, 103, 18, 7, T.Gravel)
  const inari = B.building({ id: 'inari', kind: 'shrine', variant: 'small', name: 'Inari shrine', x: 173, y: 103, w: 4, h: 3, doorX: 174, text: ['A tiny Inari shrine. Two stone foxes guard it.', 'Someone left fried tofu. The foxes did not eat it. Suspicious foxes.'] })
  B.prop({ kind: 'komainu', x: 171, y: 106, solid: true, variant: 'fox', name: 'Stone fox', text: 'A stone fox with a red bib. It has seen things.' })
  B.prop({ kind: 'komainu', x: 178, y: 106, solid: true, variant: 'fox', name: 'Stone fox', text: 'The other stone fox. It has seen the same things, from the other side.' })
  for (const y of [108]) for (const x of [172, 176]) B.prop({ kind: 'torii', x, y, w: 3, solid: true, name: 'Torii', text: 'A little vermilion torii, donated by the rice merchant "for business". The fox approves.' })
  front(B, 'inariFront', inari, 0, 1, 'up')
  B.place('catInari', 175, 107)
  B.fill(167, 110, 18, 1, T.Road)
  band(B, r, { x0: 167, x1: 184, bottom: 115, maxH: 5, pool: POOLS.merchant, group: 'town' })
  B.fill(167, 116, 18, 2, T.Road)
  band(B, r, { x0: 167, x1: 184, bottom: 123, maxH: 5, pool: POOLS.merchant, group: 'town' })
}

// ---------------------------------------------------------------------------------------------
// The castle, in its own moat (x 186–235, y 85–123)
// ---------------------------------------------------------------------------------------------

function castle(B: Builder): void {
  B.fill(186, WY0 + 1, 2, 35, T.Moat)
  B.fill(186, 118, WX1 - 186, 2, T.Moat)
  B.fill(189, WY0 + 1, WX1 - 189, 32, T.Gravel)
  B.fill(186, 120, WX1 - 186, 4, T.Gravel)
  B.fill(210, 118, 2, 2, T.Bridge)
  const wallText = 'The castle’s inner wall. Higher and whiter than the town’s. Lords like white.'
  B.building({ id: 'gateCastle', kind: 'gate', variant: 'inner', name: 'Castle Gate', x: 207, y: 115, w: 8, h: 3, door: { x: 210, y: 120 }, open: rect(210, 115, 2, 3), text: ['The castle gate. Two very straight guards could stand here.', 'Today there is one slightly bent guard and a cat.'] })
  for (let y = WY0 + 1; y <= 117; y++) if (!B.isTaken(188, y)) B.prop({ kind: 'wall', x: 188, y, solid: true, name: 'Castle wall', text: wallText })
  for (let x = 189; x < WX1; x++) if (!B.isTaken(x, 117)) B.prop({ kind: 'wall', x, y: 117, solid: true, name: 'Castle wall', text: wallText })

  B.building({ id: 'castle', kind: 'castle', name: 'Kumoi Castle', x: 204, y: 92, w: 13, h: 9, doorX: 210, litHours: [[1080, 1380]], text: ['Kumoi Castle. Five roofs, two golden fish on top, one lord who is never home.', 'The steward says the lord is "in Kyoto, with Lord Nobunaga". Must be nice.'] })
  const stable = B.building({ id: 'stable', kind: 'workshop', variant: 'stable', name: 'Castle stable', x: 224, y: 107, w: 6, h: 4, doorX: 226, text: 'The castle stable. One horse. It looks at you as if you are the slowest thing it has ever seen. It is right.' })
  B.building({ id: 'barracks', kind: 'nagaya', name: 'Barracks', x: 192, y: 107, w: 12, h: 4, doorX: 197, text: 'The barracks. Forty straw mats, forty pairs of sandals, one smell.', litHours: [[1080, 1320]] })
  B.building({ id: 'castleKura', kind: 'kura', name: 'Castle storehouse', x: 226, y: 89, w: 4, h: 5, doorX: 227, text: 'The castle’s rice store. Guarded by two spearmen and, more effectively, by the cat.' })
  B.building({ id: 'turretW', kind: 'tower', name: 'Turret', x: 190, y: 87, w: 4, h: 4, door: { x: 192, y: 91 }, text: 'A turret over the inner moat. A bored archer waves at you. You wave back. Diplomacy.' })
  // A pond garden in the castle grounds.
  B.fill(193, 94, 7, 5, T.Water)
  B.fill(195, 96, 3, 1, T.Bridge)
  B.prop({ kind: 'redbridge', x: 195, y: 96, w: 3, solid: false, name: 'Garden bridge', text: 'A little red bridge in the lord’s garden. The lord has never crossed it. The heron uses it daily.' })
  for (const [x, y, k] of [
    [192, 101, 'pine'],
    [201, 99, 'pine'],
    [219, 99, 'maple'],
    [221, 94, 'pine'],
    [232, 101, 'pine'],
    [200, 89, 'maple'],
  ] as const)
    B.prop({ kind: 'tree', x, y, variant: k, solid: true })
  for (const [x, y] of [
    [207, 104],
    [214, 104],
    [207, 112],
    [214, 112],
    [205, 122],
    [216, 122],
  ])
    lantern(B, x, y)
  B.place('castleGateGuard', 209, 121, 'down')
  B.place('castleYard', 210, 106, 'down')
  B.place('castleSteps', 211, 102, 'down')
  front(B, 'stableFront', stable, 0, 1)
  B.area('castleYard', 189, 102, 46, 13, [T.Gravel])
  B.area('moat', 186, 86, 2, 30, [T.Moat])
}

// ---------------------------------------------------------------------------------------------
// South-west: the craftsmen's quarter and a neighbourhood temple
// ---------------------------------------------------------------------------------------------

function southwest(B: Builder): void {
  const lanes = [72, 94, 95, 117, 130]
  const smithy = B.building({ id: 'smithy', kind: 'smithy', name: 'Tetsuzō Forge', x: 52, y: 129, w: 6, h: 5, doorX: 54, text: ['The forge. It’s hot enough to boil a turtle. Do not lean in.', 'Hammers, tongs, and a half-finished kitchen knife "for a samurai’s wife".'] })
  const carpenter = B.building({ id: 'carpenter', kind: 'workshop', variant: 'carpenter', name: 'Gorō Carpentry', x: 59, y: 129, w: 6, h: 5, doorX: 61, text: 'Sawdust, planks, and a half-built shrine for somebody’s grandmother.' })
  const umbrella = B.building({ id: 'umbrella', kind: 'workshop', variant: 'umbrella', name: 'Okane Umbrellas', x: 66, y: 129, w: 6, h: 5, doorX: 68, text: 'Oiled-paper umbrellas drying open like flowers. The rainy season is good business.' })
  front(B, 'smithyFront', smithy, 1, 1)
  B.place('anvil', smithy.door.x - 1, smithy.door.y, 'up')
  front(B, 'carpenterFront', carpenter, 0, 1)
  front(B, 'umbrellaFront', umbrella, 0, 1)
  B.area('carpentry', 50, 134, 30, 2, [T.Road])
  B.building({ id: 'nagayaA', kind: 'nagaya', name: 'Row houses', x: 52, y: 137, w: 12, h: 4, doorX: 57, text: 'Row houses: thin walls, loud neighbours, and somebody frying fish right now.' })
  B.building({ id: 'nagayaB', kind: 'nagaya', name: 'Row houses', x: 52, y: 143, w: 12, h: 4, doorX: 57, text: 'Row houses. A baby crying, a cat answering.' })
  B.building({ id: 'nagayaC', kind: 'nagaya', name: 'Row houses', x: 59, y: 150, w: 12, h: 4, doorX: 64, text: 'Row houses. Someone inside is practising the shakuhachi. Badly.', litHours: [[1080, 1320]] })
  B.building({ id: 'houseHachi', kind: 'machiya', name: 'Townhouse', x: 74, y: 142, w: 6, h: 5, doorX: 76, text: 'A townhouse. Muddy little footprints lead in, out, and up the wall.' })
  B.place('southStreetW', 52, 148, 'right')
  B.area('southStreet', 50, 147, 90, 2, [T.Road])

  // Jōshō-ji, the neighbourhood temple, and its graveyard.
  B.fill(97, 149, 19, 17, T.Gravel)
  B.building({ id: 'joshoji', kind: 'hondo', name: 'Jōshō-ji', x: 100, y: 151, w: 10, h: 6, doorX: 104, litHours: [[1080, 1260]], text: ['Jōshō-ji, the neighbourhood temple. Smaller than Kōun-ji up the mountain, and much easier to get to.', 'The priest here says the mountain temple is "for tourists". The mountain temple says nothing. It is up a mountain.'] })
  let k = 0
  for (let y = 160; y <= 164; y += 2)
    for (let x = 99; x <= 113; x += 2) if ((x + y) % 3) B.prop({ kind: 'grave', x, y, solid: true, variant: String(k++ % 3), name: 'Grave', text: 'A neighbourhood grave. Fresh flowers, a cup of sake, and a little paper windmill turning.' })
  B.prop({ kind: 'incense', x: 104, y: 159, w: 2, solid: true, name: 'Incense burner', text: 'An incense burner. The smoke curls up between the roofs. It smells of sandalwood and a little of grilled fish.' })
  B.prop({ kind: 'tree', x: 112, y: 152, variant: 'ginkgo', solid: true, name: 'Ginkgo', text: 'A ginkgo in the temple yard. The children say a tengu sleeps in it. The tengu has never denied it.' })
  B.prop({ kind: 'tree', x: 98, y: 152, variant: 'maple', solid: true })
  B.spot('crafts', 'spot:joshoji', 106, 158, 'up')

  for (const [bottom, h, pool] of [
    [133, 5, POOLS.crafts],
    [140, 5, POOLS.crafts],
    [146, 5, POOLS.crafts],
    [153, 5, POOLS.homes],
    [159, 5, POOLS.homes],
    [165, 4, POOLS.homes],
  ] as const)
    band(B, r, { x0: 50, x1: 139, bottom, maxH: h, pool, group: 'crafts', skip: lanes, gap: 0.2 })
}

// ---------------------------------------------------------------------------------------------
// South-east: inns, the brewery, and the Willow Canal
// ---------------------------------------------------------------------------------------------

function southeast(B: Builder): void {
  const lanes = [160, 161, 180, 181, 200, 201, 220, 221]
  const inn = B.building({ id: 'inn', kind: 'inn', name: 'Shiokaze Inn', x: 146, y: 129, w: 9, h: 6, doorX: 150, text: ['The Shiokaze Inn. "Travellers, merchants, pilgrims. Turtles by arrangement."', 'Arrangement not available.'] })
  const tofu = B.building({ id: 'tofu', kind: 'shop', variant: 'tofu', name: 'Heikichi Tofu', x: 163, y: 130, w: 6, h: 5, doorX: 165, text: 'Tubs of tofu in cold water. The tofu maker has been awake since three. It shows.' })
  const brew = B.building({ id: 'brewery', kind: 'brewery', name: 'Kurozaemon Brewery', x: 170, y: 128, w: 9, h: 7, doorX: 174, text: ['A sign on the door: NO TURTLES.', 'It has a little drawing of a turtle with a line through it. Very specific.'] })
  B.prop({ kind: 'casks', x: 182, y: 134, w: 2, solid: true, name: 'Sake casks', text: ['Straw-wrapped sake casks, stacked high.', 'You knock on one. It sloshes. Your errand sloshes.'] })
  B.building({ id: 'kuraBrew', kind: 'kura', name: 'Brewery storehouse', x: 185, y: 129, w: 4, h: 5, doorX: 186, text: 'Locked. It smells of sake. Your errand is in there. So close.' })
  front(B, 'innFront', inn, 1, 1)
  front(B, 'tofuFront', tofu, 0, 1)
  front(B, 'brewFront', brew, 0, 1)
  B.area('brewYard', 168, 135, 12, 2, [T.Road])
  B.place('southStreetE', 230, 136, 'left')
  B.building({ id: 'doctor', kind: 'machiya', variant: 'doctor', name: 'Doctor’s house', x: 146, y: 137, w: 6, h: 5, doorX: 148, text: 'The doctor’s house. A sign: "Back soon. If not, boil water anyway."' })
  B.building({ id: 'kuraHarbour', kind: 'kura', name: 'Storehouse', x: 153, y: 137, w: 4, h: 5, doorX: 154, text: 'A storehouse full of dried fish. You can smell it through the wall. So can every cat in Ise.' })
  B.building({ id: 'nagayaD', kind: 'nagaya', name: 'Row houses', x: 146, y: 162, w: 12, h: 4, doorX: 151, text: 'Row houses. Laundry, cats, children, laundry.', litHours: [[1080, 1300]] })
  B.building({
    id: 'ruin',
    kind: 'ruin',
    name: 'Burnt house',
    x: 207,
    y: 156,
    w: 6,
    h: 4,
    doorX: 209,
    text: [
      'A burnt-out house. The neighbours say it was a cooking fire. They say it quickly, and look at the castle.',
      'Among the ashes: a tea kettle, perfectly fine. Kettles survive everything. Kettles, turtles and cockroaches.',
    ],
  })
  band(B, r, { x0: 144, x1: 234, bottom: 134, maxH: 6, pool: POOLS.inns, group: 'inns', skip: lanes })
  band(B, r, { x0: 144, x1: 234, bottom: 141, maxH: 5, pool: POOLS.inns, group: 'inns', skip: lanes })
  // Teahouses along the canal: the Willow Quarter.
  band(B, r, { x0: 146, x1: 234, bottom: 147, maxH: 5, pool: POOLS.inns, group: 'inns', skip: lanes, gap: 0.3, spotEvery: 10 })
  band(B, r, { x0: 144, x1: 234, bottom: 159, maxH: 5, pool: POOLS.homes, group: 'inns', skip: lanes })
  band(B, r, { x0: 144, x1: 234, bottom: 165, maxH: 4, pool: POOLS.homes, group: 'inns', skip: lanes })
  // Willows, red lanterns and benches on the canal walks.
  for (let x = 150; x <= 230; x += 7) {
    if (lanes.includes(x) || lanes.includes(x + 1)) continue
    B.prop({ kind: 'tree', x, y: 153, variant: 'willow', solid: true, name: 'Willow', text: 'A willow trailing its hair in the canal. Poets come here to be sad on purpose.' })
  }
  for (let x = 153; x <= 230; x += 7) if (!lanes.includes(x)) lantern(B, x, 149)
  for (const x of [166, 188, 208, 226]) B.prop({ kind: 'bench', x, y: 154, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A bench by the canal. Lanterns in the water, a shamisen somewhere, a heron pretending not to watch the fish.' })
  for (const [n, x, y] of [
    ['canal1', 170, 149],
    ['canal2', 192, 154],
    ['canal3', 214, 149],
    ['canal4', 226, 154],
    ['canal5', 156, 154],
  ] as const)
    B.spot('inns', `spot:${n}`, x, y, 'down')
  B.area('canal', 150, 150, 82, 3, [T.Water])
}

/** Backyard trees and odds and ends on the grass left between the lots. */
function gardens(B: Builder): void {
  const trees: TreeKind[] = ['pine', 'maple', 'persimmon', 'broad', 'pine']
  for (let y = WY0 + 2; y < WY1 - 1; y++)
    for (let x = WX0 + 2; x < WX1 - 1; x++) {
      if (B.get(x, y) !== T.Grass || B.isTaken(x, y)) continue
      // Only in yards: grass on both sides along the row, so lanes and gaps stay open.
      const open = [B.get(x, y + 1), B.get(x, y - 1)].some((t) => t !== T.Grass)
      if (open || B.isTaken(x - 1, y) || B.isTaken(x + 1, y)) continue
      const v = r()
      if (v < 0.05) B.prop({ kind: 'tree', x, y, variant: trees[Math.floor(r() * trees.length)], solid: true })
      else if (v < 0.065) B.prop({ kind: 'laundry', x, y, solid: true, name: 'Laundry', text: 'Someone’s laundry. A loincloth, a kimono, and a very small kimono.' })
      else if (v < 0.075) B.prop({ kind: 'firewood', x, y, solid: true, name: 'Firewood', text: 'Firewood, stacked for winter by someone with opinions about stacking.' })
      else if (v < 0.082) B.prop({ kind: 'well', x, y, solid: true, name: 'Well', text: 'A backyard well. Somebody dropped a sandal in it. Left foot.' })
      else if (v < 0.095) B.prop({ kind: 'hydrangea', x, y, solid: true, name: 'Hydrangea', text: 'Hydrangeas. Blue this year. Kiyo says that means the soil is sour. Like Kiyo.' })
    }
}
