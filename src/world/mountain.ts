// The mountain on the north-east mainland: Kōun-ji temple on its summit plateau and the long climb up
// to it. Planned in its own coordinates (x 100–186 here) and dropped into the map by world/town.ts.
//
//   y 66–79   the temple approach town: pilgrim inns, charm shops and dango, the great torii
//   y 55–65   the foot of the mountain and the first flight of stairs (A)
//   y 52–54   landing 1: the six Jizō
//   y 37–51   flight B through a tunnel of vermilion torii
//   y 34–36   landing 2: a waterfall pool, and the halfway teahouse with a view over the city
//   y 25–33   flight C
//   y 22–24   landing 3, lined with lanterns
//   y 19–21   flight D up the summit cliff to the temple gate
//   y 2–18    the temple plateau: gate, main hall, pagoda, bell, pond, graveyard
//
// About 140 tiles of walking from the north barrier to the temple gate, most of it stairs (which
// slow everybody down). It's meant to feel like a hike.

import { rng } from '../engine/rng'
import { Builder, T } from './layout'
import { band, lantern, POOLS, rect } from './plan'

const r = rng(1082)
const A = 140 // the axis (in the mountain's own coordinates): approach road, flights A and D, temple gate, main hall

export function mountain(B: Builder): void {
  slopes(B)
  hike(B)
  plateau(B)
  approach(B)
}

/** Forest over the whole mountain, then the cliffs, landings and stairs carved into it. */
function slopes(B: Builder): void {
  B.fillOver(60, 0, 172, 63, T.Forest, [T.Grass, T.Sand])
  // Summit plateau.
  B.fill(100, 2, 85, 17, T.Grass)
  B.fill(115, 2, 70, 17, T.Gravel)
  // Cliff faces under each level (stairs are carved through below).
  B.fill(100, 19, 85, 3, T.Cliff)
  B.fill(136, 25, 31, 3, T.Cliff)
  B.fill(104, 37, 83, 3, T.Cliff)
  B.fill(104, 55, 47, 4, T.Cliff)
  // Landings.
  B.fill(138, 22, 27, 3, T.Gravel)
  B.fill(108, 34, 76, 3, T.Gravel)
  B.fill(167, 28, 17, 6, T.Gravel)
  B.fill(108, 52, 39, 3, T.Gravel)
  B.fill(134, 63, 16, 3, T.Gravel)
  // Flights.
  B.fill(A, 19, 4, 3, T.Stairs) // D
  B.fill(160, 25, 3, 9, T.Stairs) // C
  B.fill(111, 37, 3, 15, T.Stairs) // B
  B.fill(A, 55, 4, 8, T.Stairs) // A
  // A stream off the summit into a pool on landing 2.
  B.fill(126, 25, 2, 6, T.Water)
  B.fill(124, 31, 6, 3, T.Water)
}

function hike(B: Builder): void {
  // The foot: the great torii and a signpost.
  B.prop({ kind: 'torii', x: 135, y: 64, w: 14, solid: true, name: 'Great torii', text: ['The great torii at the foot of the mountain. Past here, the path belongs to the kami and the stairs belong to your knees.'] })
  B.prop({
    kind: 'sign',
    x: 135,
    y: 62 + 1,
    solid: true,
    name: 'Signpost',
    text: ['↑ KŌUN-JI. 1,082 steps.', 'Underneath, scratched: "1,083. I counted twice." And under that: "Then you counted wrong twice."'],
  })
  for (const x of [137, 147]) lantern(B, x, 65)
  B.prop({ kind: 'brazier', x: 149, y: 64, solid: true, name: 'Brazier', text: 'An iron fire basket for pilgrims who start the climb before dawn. They are either very devout or very bad at planning.' })
  B.place('stairsBottom', A + 1, 65, 'down')
  B.spot('temple', 'spot:foot', A + 3, 64, 'up')

  // Landing 1: the six Jizō, red bibs and all.
  for (let i = 0; i < 6; i++) B.prop({ kind: 'jizo', x: 118 + i * 2, y: 52, solid: true, name: 'Jizō', text: jizoText(i) })
  for (const x of [110, 132, 146]) lantern(B, x, 54)
  B.spot('temple', 'spot:jizo', 124, 54, 'up')
  B.place('hikeLanding1', 128, 53, 'left')

  // Flight B: the tunnel of torii, donated by merchants hoping for luck (names painted on the back).
  for (let y = 50; y >= 38; y -= 2) B.prop({ kind: 'torii', x: 110, y, w: 5, solid: true, name: 'Torii', text: toriiText(y) })
  B.spot('temple', 'spot:torii', 112, 44, 'up')

  // Landing 2: the waterfall pool, the halfway teahouse, the view.
  B.prop({ kind: 'reeds', x: 123, y: 33, solid: false })
  B.prop({ kind: 'rock', x: 130, y: 33, solid: true, name: 'Rock', text: 'A mossy rock by the pool. Generations of pilgrims have sat on it. It has the shape of their bottoms.' })
  B.place('waterfall', 127, 34, 'up')
  B.spot('temple', 'spot:pool', 131, 35, 'up')
  const chaya = B.building({ id: 'chaya', kind: 'teahouse', name: 'Halfway teahouse', x: 170, y: 28, w: 7, h: 4, doorX: 173, litHours: [[1080, 1260]], text: ['The halfway teahouse. "HALF WAY!" says the sign. A smaller sign below: "(roughly)".', 'The old woman who runs it has climbed the mountain every day for forty years. Her calves could crack walnuts.'] })
  B.place('chayaFront', chaya.door.x, chaya.door.y + 1, 'down')
  for (const x of [168, 178]) B.prop({ kind: 'bench', x, y: 35, w: 2, solid: true, npcSolid: false, name: 'Bench', text: 'A bench at the edge of the landing. Below you: the whole city, the castle, the harbour, the sea, and very small people being very busy.' })
  B.spot('temple', 'spot:view', 168, 35, 'down')
  B.spot('temple', 'spot:chaya', 174, 33, 'down')
  B.prop({ kind: 'nobori', x: 177, y: 32, solid: true, name: 'Banner', text: 'A banner: 力餅 (strength mochi). For the second half. You will need it.' })
  B.prop({
    kind: 'sign',
    x: 158,
    y: 34,
    solid: true,
    name: 'Signpost',
    text: ['"You have climbed 541 steps. Only 541 to go."', 'Someone has added: "The second half is the first half, but uphill-er."'],
  })
  for (const x of [109, 118, 136, 150]) lantern(B, x, 36)
  B.place('stairsMid', 156, 35, 'down')

  // Landing 3: lanterns all the way along.
  for (let x = 138; x <= 164; x += 4) if ((x < A || x > A + 3) && (x < 160 || x > 162)) lantern(B, x, 24)
  B.spot('temple', 'spot:landing3', 152, 23, 'down')
}

function plateau(B: Builder): void {
  // Pond with a red bridge, and the graveyard, on the grassy west end.
  for (let y = 3; y <= 9; y++)
    for (let x = 101; x <= 113; x++) {
      const dx = (x + 0.5 - 107) / 6
      const dy = (y + 0.5 - 6.5) / 3.4
      if (dx * dx + dy * dy <= 1) B.set(x, y, T.Water)
    }
  B.fill(104, 6, 6, 1, T.Bridge)
  B.prop({ kind: 'redbridge', x: 104, y: 6, w: 6, solid: false, name: 'Red bridge', text: 'A vermilion bridge over the koi pond. The koi follow you, hoping you are bread.' })
  let k = 0
  for (let y = 12; y <= 17; y += 2)
    for (let x = 101; x <= 113; x += 2) {
      if ((x + y) % 3 === 0) continue
      B.prop({ kind: 'grave', x, y, solid: true, variant: String(k++ % 3), name: 'Grave', text: graveText(k) })
    }

  B.building({ id: 'sanmon', kind: 'sanmon', name: 'Sanmon gate', x: A - 4, y: 15, w: 12, h: 4, door: { x: A + 1, y: 19 }, open: rect(A, 15, 4, 4), text: ['The temple gate. Two fierce guardian kings glare from the side bays.', 'One is red, one is blue. Both are judging your posture. Especially after those stairs.'] })
  B.building({ id: 'hondo', kind: 'hondo', name: 'Main hall', x: A - 7, y: 2, w: 18, h: 8, doorX: A + 1, litHours: [[1050, 1290]], text: ['The main hall of Kōun-ji. Incense, gold leaf, and a very large, very calm Buddha.', 'You bow. Your shell clacks on the floor. The Buddha remains calm. He took the stairs too, once.'] })
  B.building({ id: 'pagoda', kind: 'pagoda', name: 'Five-storey pagoda', x: 160, y: 4, w: 5, h: 6, doorX: 162, litHours: [[1080, 1260]], text: ['The five-storey pagoda: earth, water, fire, wind and sky, stacked up.', 'It has survived three earthquakes. It sways. It does not care.'] })
  B.building({ id: 'belltower', kind: 'belltower', name: 'Bell tower', x: 118, y: 7, w: 4, h: 4, doorX: 119, text: ['The great bronze bell. Rung at dawn and dusk. On a still day they hear it on the boats.', 'At New Year it’s rung 108 times, once for each worldly desire. Sake is several of them.'] })
  B.building({ id: 'kuri', kind: 'machiya', variant: 'temple', name: 'Monks’ quarters', x: 166, y: 12, w: 8, h: 5, doorX: 169, text: 'The monks’ quarters. Smells of rice and floor polish. Mostly floor polish.' })
  B.building({ id: 'hut', kind: 'hut', name: "Kakuzen's hut", x: 178, y: 3, w: 4, h: 4, doorX: 179, text: 'A sign: "Meditation in progress. Do not disturb." Snoring from inside.' })
  B.building({ id: 'jizoHall', kind: 'shrine', variant: 'small', name: 'Jizō hall', x: 124, y: 12, w: 4, h: 3, doorX: 125, text: 'A little hall full of small stone Jizō, each one for a child. Bibs, pinwheels, a ball of rice. Quiet here.' })
  B.prop({ kind: 'incense', x: A + 1, y: 12, w: 2, solid: true, name: 'Incense burner', text: 'A bronze incense burner. Pilgrims waft the smoke over themselves for health. You waft some onto your shell. Your knees feel better.' })
  for (const [x, y] of [
    [A - 6, 11],
    [A + 9, 11],
    [A - 6, 17],
    [A + 9, 17],
    [155, 11],
    [130, 11],
  ])
    lantern(B, x, y)
  B.prop({ kind: 'tree', x: 128, y: 9, variant: 'ginkgo', solid: true, name: 'Ginkgo', text: 'A ginkgo older than the temple. In autumn it turns gold. In summer it just looks smug about it.' })
  B.prop({ kind: 'tree', x: 156, y: 15, variant: 'sacred', solid: true, name: 'Sacred cedar', text: 'A cedar with a straw rope round it: a kami lives here. The kami has an excellent view.' })
  for (const [x, y, v] of [
    [116, 16, 'maple'],
    [176, 16, 'maple'],
    [183, 10, 'cedar'],
    [152, 3, 'cedar'],
    [116, 3, 'cedar'],
  ] as const)
    B.prop({ kind: 'tree', x, y, variant: v, solid: true })

  B.place('hondoFront', A + 1, 11, 'up')
  B.place('hondoSide', A + 5, 11, 'up')
  B.place('incense', A + 4, 12, 'up')
  B.place('bell', 119, 12, 'up')
  B.place('pagodaFront', 162, 11, 'up')
  B.place('graves', 108, 18, 'up')
  B.place('templePond', 107, 10, 'up')
  B.place('stairsTop', A + 2, 20, 'down')
  B.place('sanmonFront', A + 3, 19, 'up')
  B.spot('temple', 'spot:hondo', A - 2, 11, 'up')
  B.spot('temple', 'spot:bell', 121, 12, 'up')
  B.spot('temple', 'spot:pagoda', 164, 11, 'up')
  B.spot('temple', 'spot:graves', 110, 18, 'up')
  B.spot('temple', 'spot:jizohall', 125, 16, 'up')
  B.area('templeGrounds', 115, 2, 70, 17, [T.Gravel])
  B.area('graveyard', 100, 11, 15, 8, [T.Grass])
  B.area('templePond', 101, 3, 13, 7, [T.Water])
  B.area('stairs', A, 19, 23, 15, [T.Stairs])
}

/** The temple village at the foot of the mountain, above Kumoi. */
function approach(B: Builder): void {
  B.fill(A, 66, 4, 14, T.Road)
  B.fill(100, 76, 85, 2, T.Road)
  B.building({ id: 'incenseShop', kind: 'shop', variant: 'incense', name: 'Incense & charms', x: 133, y: 71, w: 6, h: 5, doorX: 135, text: 'Charms for luck, health, exams and safe travel. None for turtles. A gap in the market.' })
  const dango = B.building({ id: 'dango', kind: 'shop', variant: 'sweets', name: 'Dango stand', x: 145, y: 71, w: 6, h: 5, doorX: 147, text: 'A dango stand for pilgrims about to climb the mountain, and pilgrims who just did and can’t feel their legs.' })
  B.place('dangoFront', dango.door.x, dango.door.y + 1, 'down')
  band(B, r, { x0: 100, x1: 184, bottom: 75, maxH: 5, pool: POOLS.pilgrims, group: 'approach', gap: 0.35, skip: [A, A + 1, A + 2, A + 3, 120, 166] })
  B.fill(120, 66, 1, 10, T.Road)
  B.fill(166, 66, 1, 10, T.Road)
  for (const [x, y] of [
    [A - 1, 68],
    [A + 4, 68],
    [A - 1, 72],
    [A + 4, 72],
  ])
    lantern(B, x, y)
  B.prop({ kind: 'brazier', x: A - 1, y: 79, solid: true, name: 'Brazier', text: 'An iron fire basket by the north bridge. Warm. Very warm.' })
  for (const [n, x, y] of [
    ['app1', 110, 77],
    ['app2', 128, 76],
    ['app3', 155, 77],
    ['app4', 175, 76],
  ] as const)
    B.spot('approach', `spot:${n}`, x, y, 'down')
}

function jizoText(i: number): string {
  return [
    'A stone Jizō in a red bib. The first of six: one for each of the six realms of rebirth.',
    'The second Jizō. Someone has given him a tiny straw hat against the rain.',
    'The third Jizō. A pinwheel in his hand, spinning in the mountain wind.',
    'The fourth Jizō, worn almost smooth. He has been smiling for three hundred years. It shows.',
    'The fifth Jizō. A rice ball at his feet. A crow eyes it. Jizō eyes the crow.',
    'The sixth Jizō, guardian of travellers. You bow. You are, after all, travelling. Uphill.',
  ][i]
}

function toriiText(y: number): string {
  const t = [
    'A vermilion torii. On the back: "Donated by Rihei, rice merchant. For prosperity." Very large letters.',
    'A torii. On the back: "Donated by Kurozaemon, brewer. For a good year." Underneath, small: "Please."',
    'A torii. On the back: "Donated by the fishwives of Kumoi. For calm seas and loud voices."',
    'A torii, newer than the others. "Donated by a grateful pilgrim from Iga." No name.',
    'A torii. The paint is peeling. Behind it, another torii. Behind that, another. It’s torii all the way up.',
    'A torii. "Donated by Otaki of the Drunken Octopus. For profits. And forgiveness. Mostly profits."',
    'The last torii of the tunnel. Light ahead, and the sound of water.',
  ]
  return t[(50 - y) / 2]
}

function graveText(k: number): string {
  const t = [
    'A weathered gravestone. Someone left fresh flowers and a cup of sake. You leave the sake. Respect.',
    'A small grave with a stone frog on top. "Kaeru" means both frog and return home.',
    'An old samurai’s grave. Moss has made it look distinguished.',
    'A merchant’s grave, bigger than the samurai’s. Someone in the family had opinions.',
  ]
  return t[k % t.length]
}
