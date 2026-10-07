// The harbour south of the city walls, and the fishing village on the west beach.
//
//   y 173      a lane along the moat
//   y 174–178  warehouses, the shipwright, the fish market, taverns, the harbour office
//   y 179–181  the harbour plaza;  y 182–183 the harbour road
//   y 184–187  the stone quay;  y 188+ the sea: piers, a merchant ship, the breakwater lighthouse

import { pick, rng, type Rng } from '../engine/rng'
import { Builder, T } from './layout'
import { AVE_X, band, lantern, QUAY_SEA, type Lot } from './plan'

const r = rng(1543)
const X0 = 30
const X1 = 237

const harbourLot = (rr: Rng): Lot => {
  const v = rr()
  if (v < 0.4)
    return {
      kind: 'kura',
      variant: 'harbour',
      w: 7,
      h: 5,
      name: 'Warehouse',
      text: [pick(rr, ['A harbour warehouse. Rice from Ise, cotton from Owari, and something marked "DO NOT OPEN (cats)".', 'A warehouse full of rice bales. The rats here are very well fed and very polite.', 'Cotton bales from Owari. Soft. You test one with your face. Very soft.', 'A warehouse of salt fish. The smell has its own weather.'])],
    }
  if (v < 0.55) return { kind: 'tavern', w: 7, h: 5, name: 'Sailors’ tavern', text: ['A sailors’ tavern. A song about a mermaid, sung by men who have clearly never met one.'] }
  if (v < 0.7) return { kind: 'fishhut', w: 4, h: 4, name: 'Fisherfolk hut', text: ['A fisherman’s hut. Nets inside, nets outside, nets on the roof.'] }
  if (v < 0.8) return { kind: 'shop', variant: 'harbour', w: 6, h: 5, name: 'Shipping agent', text: ['A shipping agent. Ledgers, tide tables, and a clerk asleep on both.'] }
  return { kind: 'nagaya', w: 10, h: 4, name: 'Dockers’ row houses', text: ['Dockworkers’ row houses. Everyone inside is asleep or shouting; occasionally both.'], home: true }
}

export function harbour(B: Builder): void {
  B.fill(X0, 173, X1 - X0 + 1, 1, T.Road)
  B.fill(X0, 179, X1 - X0 + 1, 3, T.Plaza)
  B.fill(X0, 182, X1 - X0 + 1, 2, T.Road)
  B.fill(36, 184, X1 - 36 + 1, QUAY_SEA - 184, T.Stone)
  B.fill(AVE_X, 173, 4, 6, T.Plaza)
  // East channel from the moat to the sea, bridged by the lane, the plaza and the road.
  B.fill(238, 170, 3, QUAY_SEA - 170, T.Moat)
  B.fill(238, 173, 3, 1, T.Bridge)
  B.fill(238, 179, 3, 5, T.Bridge)
  // Piers and the breakwater.
  B.fill(60, QUAY_SEA, 2, 9, T.Pier)
  B.fill(100, QUAY_SEA, 2, 14, T.Pier)
  B.fill(150, QUAY_SEA, 2, 8, T.Pier)
  B.fill(182, QUAY_SEA, 2, 10, T.Pier)
  B.fill(226, QUAY_SEA, 3, 17, T.Stone)

  const ship = B.building({ id: 'shipwright', kind: 'shipwright', name: 'Shipwright', x: 50, y: 174, w: 8, h: 5, doorX: 53, text: ['A half-built boat on its frame, like the bones of a whale.', 'Chalked on the hull: "FAST. FOR AN IMPORTANT GUEST. DON’T ASK."'] })
  const market = B.building({ id: 'fishmarket', kind: 'fishmarket', name: 'Fish market', x: 62, y: 175, w: 10, h: 4, doorX: 66, text: ['The fish market. Bonito, sea bream, squid, and a very large tuna nobody can afford.', 'The cats have formed a union.'] })
  const tavern = B.building({ id: 'tavern', kind: 'tavern', name: 'The Drunken Octopus', x: 76, y: 174, w: 7, h: 5, doorX: 79, text: ['A tavern. Red lanterns, loud sailors, and a sign: "THE DRUNKEN OCTOPUS".', 'The octopus on the sign is, to be fair, drunk.'] })
  const office = B.building({ id: 'office', kind: 'shop', variant: 'harbour', name: 'Harbour office', x: 86, y: 174, w: 6, h: 5, doorX: 88, text: 'The harbour office. A chart of the bay, a tide table, and a list titled "Boats for important guests".' })
  B.building({ id: 'warehouseE1', kind: 'kura', variant: 'harbour', name: 'Warehouse', x: 160, y: 174, w: 7, h: 5, doorX: 163, text: 'A warehouse full of rice bales. The rats here are very well fed and very polite.' })
  B.building({ id: 'fishhut', kind: 'fishhut', name: "Sanpei's hut", x: 196, y: 175, w: 4, h: 4, doorX: 197, text: 'A board nailed by the door: "BIGGEST CARP: 3 shaku." Someone has crossed it out and written "1".' })
  B.building({ id: 'fishhut2', kind: 'fishhut', name: 'Fisherfolk hut', x: 202, y: 175, w: 4, h: 4, doorX: 203, text: 'A net-mender’s hut. Nets inside, nets outside, nets on the roof.' })
  B.building({ id: 'netshed', kind: 'hut', name: 'Net shed', x: 208, y: 175, w: 4, h: 4, doorX: 209, text: 'A shed of old nets, older ropes, and one ancient boat paddle with teeth marks.' })
  B.prop({ kind: 'brazier', x: AVE_X - 2, y: 178, solid: true, name: 'Brazier', text: 'An iron fire basket for the night watch at the sea gate. Turtle-roasting warm.' })
  band(B, r, { x0: X0 + 2, x1: X1 - 2, bottom: 178, maxH: 5, pool: harbourLot, group: 'harbour', gap: 0.3, skip: [AVE_X - 1, AVE_X, AVE_X + 1, AVE_X + 2, AVE_X + 3, AVE_X + 4] })

  B.prop({ kind: 'ship', x: 103, y: 203, w: 10, h: 4, solid: true, name: 'Merchant ship', text: ['The merchant ship "Ise Maru". A big square sail, a painted eye on the bow.', 'The eye follows you. It’s just paint. Probably.'] })
  B.prop({ kind: 'lighthouse', x: 227, y: QUAY_SEA + 16, solid: true, name: 'Lighthouse', text: ['A stone lighthouse at the end of the breakwater. A fire burns in it all night.', 'Somebody has to climb up there with oil every evening. That somebody complains a lot.'] })
  for (const [x, y] of [
    [63, 196],
    [97, 194],
    [147, 197],
    [154, 194],
    [186, 196],
    [178, 199],
    [44, 195],
    [215, 196],
  ])
    B.prop({ kind: 'boat', x, y, solid: true, name: 'Fishing boat', text: 'A fishing boat, rocking gently. It smells of fish and very old decisions.' })
  for (const [x, y] of [
    [104, 184],
    [108, 184],
    [125, 185],
    [130, 184],
    [170, 185],
    [44, 185],
    [90, 186],
  ])
    B.prop({ kind: 'bales', x, y, w: 2, solid: true, name: 'Rice bales', text: 'Rice bales, waiting for a ship. Each one is a samurai’s pay for a month. You sit on one. Briefly rich.' })
  for (const [x, y] of [
    [112, 185],
    [166, 184],
    [72, 185],
    [192, 186],
  ])
    B.prop({ kind: 'crates', x, y, solid: true, name: 'Crates', text: 'Crates stamped with a crest you don’t recognise. One rattles. One meows.' })
  B.prop({ kind: 'anchor', x: 82, y: 187, solid: true, name: 'Anchor', text: 'A spare anchor. Heavier than you. Heavier than three of you.' })
  B.prop({ kind: 'nets', x: 199, y: 185, solid: true, name: 'Fishing nets', text: 'Nets drying on poles. One has a sandal in it. Left foot.' })
  B.prop({ kind: 'nets', x: 205, y: 184, solid: true, name: 'Fishing nets', text: 'More nets. The harbour runs on nets and gossip.' })
  B.prop({ kind: 'casks', x: 84, y: 181, w: 2, solid: true, name: 'Sake casks', text: 'Casks for the tavern. Several are lighter than they should be.' })
  for (let x = 40; x <= 232; x += 12) if (x < AVE_X - 2 || x > AVE_X + 5) lantern(B, x, QUAY_SEA - 1)

  B.place('seaGateNight', AVE_X - 1, 179, 'down')
  B.place('pierW', 61, 195, 'down')
  B.place('pierMid', 101, 201, 'down')
  B.place('pierMidFoot', 101, QUAY_SEA + 1, 'down')
  B.place('pierE', 183, 196, 'down')
  B.place('shipSide', 101, 199, 'right')
  B.place('breakwater', 227, 201, 'down')
  B.place('lighthouseFoot', 227, 203, 'up')
  B.place('fishCounter', market.door.x - 2, 180, 'down')
  B.place('fishCounter2', market.door.x + 2, 180, 'down')
  B.place('catFish', market.door.x - 4, 181)
  B.place('catFish2', market.door.x + 4, 181)
  B.place('catFish3', market.door.x + 6, 181)
  B.place('netMend', 202, 185, 'down')
  B.place('slipway', ship.door.x, 180, 'up')
  B.place('tavernFront', tavern.door.x, 180, 'down')
  B.place('tavernIn1', tavern.door.x + 2, 180, 'down')
  B.place('officeFront', office.door.x, 180, 'down')
  B.place('quayW', 48, 185, 'down')
  B.place('quayE', 210, 185, 'down')
  B.place('warehouseFront', 163, 180, 'down')
  B.place('harbourStreet', 150, 182, 'down')
  for (const [n, x, y] of [
    ['h1', 70, 185],
    ['h2', 96, 186],
    ['h3', 120, 185],
    ['h4', 158, 186],
    ['h5', 176, 185],
    ['h6', 214, 185],
    ['h7', 60, 181],
    ['h8', 128, 180],
    ['h9', 188, 181],
    ['h10', 101, 195],
    ['h11', 150, 193],
  ] as const)
    B.spot('harbour', `spot:${n}`, x, y, 'down')
  B.area('quay', 36, 184, X1 - 36 + 1, QUAY_SEA - 184, [T.Stone])
  B.area('harbourStreet', X0, 182, X1 - X0 + 1, 2, [T.Road])
  B.area('docks', 90, 182, 80, 6, [T.Stone, T.Road])
  B.area('shipwrightYard', 46, 179, 14, 6, [T.Plaza, T.Road])
}
