// Outside the walls: the rice fields and farms to the west, the Iga refugee camp by the West Gate,
// the fishing village on the west beach, the river and woods to the east with the old shrine, the
// east beach, and Roshi's island out in the bay.

import { Builder, CROP, idx, T, type TreeKind } from './layout'
import { fenceRect, lantern, MAIN_Y } from './plan'

/** The river: centre column per row. */
export function riverX(y: number): number {
  return 256 + Math.round(3 * Math.sin(y / 13) + 1.5 * Math.sin(y / 5 + 2))
}

export function outskirts(B: Builder): void {
  farms(B)
  camp(B)
  fishingVillage(B)
  east(B)
  island(B)
}

// ---------------------------------------------------------------------------------------------
// Farms (west of the moat)
// ---------------------------------------------------------------------------------------------

function farms(B: Builder): void {
  const lane = 30
  B.fill(lane, 62, 2, 114, T.Road) // farm lane, north to the bamboo, south to the fishing village
  B.fill(2, 128, 28, 1, T.Road) // Kiyo's lane
  B.fill(2, 108, 28, 1, T.Road) // Gonbei's lane
  // Terraced paddies, in plots of 5×3 with levees between.
  for (let cx = 3; cx <= 23; cx += 6)
    for (let cy = 64; cy <= 104; cy += 4) {
      B.fill(cx, cy, 5, 3, T.Paddy)
      if (cy >= 84) for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) if (x < 15 || y < 92) B.planted[idx(x, y)] = 1
      if (cy < 84) for (let y = cy; y < cy + 3; y++) for (let x = cx; x < cx + 5; x++) B.planted[idx(x, y)] = 1
    }
  // Vegetable fields.
  const fieldBlock = (x: number, y: number, w: number, h: number, crop: number) => {
    B.fill(x, y, w, h, T.Field)
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) B.crops[idx(i, j)] = crop
  }
  fieldBlock(3, 142, 10, 5, CROP.daikon)
  fieldBlock(15, 142, 10, 5, CROP.eggplant)
  fieldBlock(3, 149, 10, 5, CROP.cabbage)
  fieldBlock(15, 149, 10, 5, CROP.cucumber)
  fieldBlock(3, 156, 10, 5, CROP.daikon)
  fieldBlock(15, 156, 10, 5, CROP.cabbage)

  B.building({ id: 'gonbei', kind: 'minka', name: "Gonbei's farmhouse", x: 6, y: 112, w: 7, h: 5, doorX: 9, text: 'Muddy sandals in four sizes. A chewed one in a fifth size: Pochi.' })
  B.building({ id: 'coop', kind: 'coop', name: 'Chicken coop', x: 15, y: 112, w: 3, h: 3, doorX: 16, text: 'The chicken coop. It smells of ambition.' })
  B.building({ id: 'kiyo', kind: 'minkaOld', name: "Kiyo's farmhouse", x: 3, y: 132, w: 6, h: 5, doorX: 5, text: 'A sign: "Turtles will be made into soup." Underneath, smaller: "Eventually."' })
  B.building({ id: 'yasaku', kind: 'cottage', name: "Yasaku's cottage", x: 22, y: 131, w: 6, h: 4, doorX: 24, text: 'A carter’s cottage. A cart outside with one wheel slightly smaller than the other. It goes in circles. Slowly.' })
  B.building({ id: 'farmB', kind: 'minkaOld', name: 'Farmhouse', x: 14, y: 132, w: 6, h: 5, doorX: 16, litHours: [[1080, 1290]], text: 'A farmhouse. Three generations, one hearth, and a grandfather who has opinions about all of it.' })
  B.building({ id: 'farmC', kind: 'minka', name: 'Farmhouse', x: 20, y: 117, w: 7, h: 5, doorX: 23, litHours: [[1080, 1260]], text: 'A farmhouse with a straw rope over the door against bad luck. It has not worked yet, but it is patient.' })
  fenceRect(B, 14, 111, 19, 117, [{ x: 17, y: 117 }])
  fenceRect(B, 21, 109, 27, 115, [{ x: 24, y: 115 }])
  B.prop({ kind: 'trough', x: 22, y: 110, solid: true, name: 'Trough', text: 'Benkei’s trough. Licked clean. Then licked again, just in case.' })
  B.prop({ kind: 'scarecrow', x: 8, y: 102, solid: true, name: 'Scarecrow', text: ['Gonbei’s scarecrow. The crows use it as a perch.', 'It’s had a hard life.'] })
  B.prop({ kind: 'scarecrow', x: 13, y: 154, solid: true, name: 'Scarecrow', text: 'Kiyo’s scarecrow. It’s wearing Kiyo’s old hat. The crows are genuinely afraid of it.' })
  B.prop({ kind: 'hay', x: 2, y: 110, solid: true, name: 'Haystack', text: 'A haystack. Perfect for a nap. You’re a turtle; everything is perfect for a nap.' })
  B.prop({ kind: 'hay', x: 26, y: 139, solid: true, name: 'Haystack', text: 'A haystack. A child-shaped dent in one side. Taro’s "ninja hideout".' })
  B.prop({ kind: 'firewood', x: 2, y: 136, solid: true, name: 'Firewood', text: 'Firewood, stacked with terrifying precision. Kiyo did this.' })
  B.prop({ kind: 'laundry', x: 3, y: 116, w: 2, solid: true, name: 'Laundry', text: 'Gonbei’s spare loincloth, flapping proudly. You look away respectfully.' })
  B.prop({ kind: 'jizo', x: 33, y: MAIN_Y - 1, solid: true, name: 'Jizō', text: ['A stone Jizō in a red bib, guardian of travellers.', 'Someone left him a rice ball. You consider it. You leave it. Good turtle.'] })
  B.prop({ kind: 'sign', x: 2, y: MAIN_Y - 1, solid: true, name: 'Signpost', text: ['← SAKAI. Five days’ walk.', 'For a turtle: next year.'] })
  for (const [x, y, k] of [
    [4, 120, 'persimmon'],
    [26, 145, 'maple'],
    [27, 160, 'pine'],
    [19, 124, 'broad'],
    [1, 112, 'persimmon'],
  ] as const)
    B.prop({ kind: 'tree', x, y, variant: k as TreeKind, solid: true })

  B.place('gonbeiStep', 10, 118, 'down')
  B.place('callKids', 9, 118, 'down')
  B.place('dogBed', 10, 118)
  B.place('oxGate', 24, 116, 'up')
  B.place('laundryFarm', 4, 117, 'up')
  B.place('kiyoStep', 6, 138, 'down')
  B.place('farmRoad', lane, MAIN_Y - 2, 'down')
  B.place('westEdge', 0, MAIN_Y + 1, 'left')
  B.spot('farm', 'spot:farm1', lane + 1, 100, 'left')
  B.spot('farm', 'spot:farm2', 18, 128, 'down')
  B.spot('farm', 'spot:farm3', 26, 108, 'down')
  B.spot('farm', 'spot:farm4', lane, 150, 'left')
  B.area('paddies', 3, 84, 23, 23, [T.Paddy])
  B.area('fields', 3, 142, 22, 19, [T.Field])
  B.area('chickenYard', 15, 112, 4, 5)
  B.area('oxPen', 22, 110, 5, 5)
  B.area('farmLane', lane, 62, 2, 114, [T.Road])
}

// ---------------------------------------------------------------------------------------------
// The refugee camp: Iga survivors between the farm lane and the moat, by the West Gate
// ---------------------------------------------------------------------------------------------

function camp(B: Builder): void {
  const tentText = (who: string) => [`A tent of patched rice sacks. ${who}`, 'It smells of woodsmoke and wet hemp. Everything out here does.']
  B.building({ id: 'tentA', kind: 'tent', name: 'Tent', x: 34, y: 107, w: 3, h: 2, doorX: 35, text: tentText('Old Sōkyū’s, and Masa’s. Two bedrolls, as far apart as the tent allows.') })
  B.building({ id: 'tentB', kind: 'tent', name: 'Tent', x: 38, y: 110, w: 3, h: 2, doorX: 39, text: tentText('Oshizu’s. Very tidy. Nothing to make untidy.') })
  B.building({ id: 'tentC', kind: 'tent', name: 'Tent', x: 34, y: 114, w: 3, h: 2, doorX: 35, text: tentText('Kotaro has drawn a turtle on it in charcoal. A heroic turtle. With a sword.') })
  B.building({ id: 'tentD', kind: 'tent', name: 'Tent', x: 39, y: 116, w: 3, h: 2, doorX: 40, text: tentText('A family of five sleeps in here. In shifts.') })
  B.building({ id: 'tentE', kind: 'tent', name: 'Tent', x: 34, y: 103, w: 3, h: 2, doorX: 35, text: tentText('Empty. A pair of straw sandals neatly side by side at the entrance. Nobody touches them.') })
  B.prop({
    kind: 'campfire',
    x: 38,
    y: 114,
    solid: true,
    name: 'Campfire',
    text: ['The camp’s fire. It never goes out: someone always sits up with it.', 'A pot of something grey bubbles over it. You decide it’s soup. It decides nothing.'],
  })
  B.prop({ kind: 'bedroll', x: 38, y: 107, solid: false, name: 'Bedroll', text: 'A bedroll airing in the open. It has been airing for a week. It is never going to be dry.' })
  B.prop({ kind: 'bedroll', x: 36, y: 119, solid: false, name: 'Bedroll', text: 'A spare bedroll. Spare since winter.' })
  B.prop({ kind: 'grave', x: 41, y: 120, variant: '2', solid: true, name: 'Grave', text: ['A fresh mound with a wooden marker. No name on it. Just: "from Iga".', 'Someone has left a wildflower. Kotaro, probably. He’d deny it.'] })
  B.place('campFireW', 37, 114, 'right')
  B.place('campFireS', 38, 115, 'up')
  B.place('campEdge', 35, 121, 'left')
  B.place('campN', 37, 102, 'up')
  B.area('camp', 34, 101, 8, 21, [T.Grass])
  B.spot('camp', 'spot:camp1', 40, 113, 'left')
  B.spot('camp', 'spot:camp2', 36, 110, 'down')
}

// ---------------------------------------------------------------------------------------------
// The fishing village on the west beach
// ---------------------------------------------------------------------------------------------

function fishingVillage(B: Builder): void {
  for (const [x, y] of [
    [6, 180],
    [12, 181],
    [18, 180],
    [24, 182],
  ])
    B.building({ id: `fv${x}`, kind: 'fishhut', name: 'Fisherfolk hut', x, y, w: 4, h: 4, doorX: x + 1, litHours: [[1080, 1260]], text: 'A fisherman’s hut on the sand. Drying squid hung like laundry, and a grandmother mending a net with her toes.' })
  B.prop({ kind: 'nets', x: 10, y: 187, solid: true, name: 'Fishing nets', text: 'Nets drying in the sun. A cat asleep in one, like a fish that got lucky.' })
  B.prop({ kind: 'nets', x: 22, y: 188, solid: true, name: 'Fishing nets', text: 'Nets, floats and a broken oar. The oar has a name carved in it: "NEVER AGAIN".' })
  B.place('beachWestSpot', 16, 190, 'down')
  B.spot('harbour', 'spot:fv1', 14, 186, 'down')
  B.area('beachWest', 2, 186, 30, 8, [T.Sand])
}

// ---------------------------------------------------------------------------------------------
// East: the river, the woods, the old shrine, the east beach
// ---------------------------------------------------------------------------------------------

function east(B: Builder): void {
  const sx = 268
  B.fill(sx - 3, 96, 10, 11, T.Gravel)
  B.building({ id: 'shrine', kind: 'shrine', name: 'Old Kumoi Shrine', x: sx - 2, y: 97, w: 8, h: 5, doorX: sx + 1, text: ['An offering box. You have no coins.', 'You offer a respectful nod instead. The kami nod back. Probably.'] })
  B.fill(sx, 107, 2, MAIN_Y + 1 - 107, T.Road)
  B.fill(sx + 2, MAIN_Y + 2, 1, 52, T.Road) // woodland trail down to the east beach
  B.prop({ kind: 'torii', x: sx - 1, y: 110, w: 4, solid: true, name: 'Torii', text: 'The torii of the old shrine. Past it is the kami’s ground. Wipe your feet. All four.' })
  B.prop({ kind: 'komainu', x: sx - 2, y: 104, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth open: "a". Its partner says "un". Together: everything.' })
  B.prop({ kind: 'komainu', x: sx + 3, y: 104, solid: true, name: 'Komainu', text: 'A stone lion-dog, mouth closed: "un". It has nothing more to say.' })
  lantern(B, sx - 1, 106)
  lantern(B, sx + 2, 106)
  B.prop({ kind: 'sign', x: 285, y: MAIN_Y - 1, solid: true, name: 'Signpost', text: ['OKAZAKI → Three provinces. Mountains, bandits, ninja.', 'Not recommended for turtles.'] })
  B.place('shrineFront', sx + 1, 103, 'up')
  B.place('eastRoad', 248, MAIN_Y + 2, 'right')
  B.place('riverbank', riverX(150) + 3, 150, 'left')
  B.spot('farm', 'spot:shrine', sx + 3, 105, 'up')
  B.area('beachEast', 242, 186, 44, 10, [T.Sand])
  B.area('shrineGrounds', sx - 3, 102, 10, 4, [T.Gravel])
}

// ---------------------------------------------------------------------------------------------
// Roshi's island
// ---------------------------------------------------------------------------------------------

export const ISLAND = { x: 262, y: 209 }

function island(B: Builder): void {
  for (let y = 198; y < B.h; y++)
    for (let x = 244; x < B.w; x++) {
      const dx = (x + 0.5 - ISLAND.x) / 12
      const dy = (y + 0.5 - ISLAND.y) / 6
      if (dx * dx + dy * dy <= 1) B.set(x, y, T.Sand)
    }
  B.building({ id: 'kamehouse', kind: 'kamehouse', name: 'Kame House', x: ISLAND.x - 3, y: ISLAND.y - 5, w: 6, h: 4, doorX: ISLAND.x - 1, text: ['KAME HOUSE. Pink walls, red roof, a lifebuoy, and a stack of "reading material" by the door.', 'You do not read the reading material. You are a good turtle.'] })
  B.prop({ kind: 'tree', x: ISLAND.x - 7, y: ISLAND.y, variant: 'blackpine', solid: true, name: 'Pine', text: 'A crooked pine. Roshi says he planted it. Roshi says a lot of things.' })
  B.prop({ kind: 'tree', x: ISLAND.x + 6, y: ISLAND.y - 2, variant: 'blackpine', solid: true })
  B.prop({ kind: 'sign', x: ISLAND.x + 4, y: ISLAND.y + 2, solid: true, name: 'Sign', text: ['"TURTLE SCHOOL. Est. three hundred years ago."', 'Underneath: "Students: 1 (turtle). Fees: sake."'] })
  B.place('roshiChair', ISLAND.x + 2, ISLAND.y + 2, 'down')
  B.place('roshiDoor', ISLAND.x - 1, ISLAND.y, 'down')
  B.place('roshiShore', ISLAND.x - 1, ISLAND.y + 3, 'down')
  B.area('island', ISLAND.x - 10, ISLAND.y - 4, 20, 9, [T.Sand])
}
