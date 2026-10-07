// Things lying about that belong to somebody: Sanpei's sandal, Oshio's fish, Kiyo's cucumber,
// Oume's dango, Kurozaemon's good sake. Each has a home spot it goes back to.

import type { ItemKind } from '../art/items'
import type { Pt } from '../world/layout'

export interface ItemDef {
  kind: ItemKind
  name: string
  /** Villager id who'll chase you for it. */
  owner?: string
  /** Place it sits at (a few pixels off). */
  at: string
  dx?: number
  dy?: number
  /** Eaten on the spot instead of carried. */
  edible?: boolean
  /** Only out at home during these [from, to) minutes (the sake is locked up at night). */
  hours?: [number, number]
  /** What the owner shouts on seeing it go. */
  shout: string
}

export const ITEM_DEFS: ItemDef[] = [
  { kind: 'sandal', name: 'Sanpei’s left sandal', owner: 'sanpei', at: 'quayE', dx: 10, dy: 2, shout: 'MY SANDAL! Not again! Not the LEFT one!' },
  { kind: 'fish', name: 'a mackerel', owner: 'oshio', at: 'fishCounter', dx: -10, dy: 4, shout: 'THIEF! FISH THIEF! A TURTLE IS STEALING MY FISH!' },
  { kind: 'cucumber', name: 'Kiyo’s cucumber', owner: 'kiyo', at: 'kiyoStep', dx: 12, dy: 2, shout: 'That’s MY cucumber, you overgrown pebble!' },
  { kind: 'dango', name: 'Oume’s dango', owner: 'oume', at: 'teaCounter', dx: 12, dy: 2, edible: true, shout: 'MY DANGO! Those were for paying customers!' },
  { kind: 'sake', name: 'the good sake', owner: 'kurozaemon', at: 'kuraBrewFront', dx: 8, dy: 2, hours: [7 * 60, 18 * 60], shout: 'THE GOOD SAKE! Stop that turtle! STOP THAT ROSHI-TURTLE!' },
  { kind: 'fan', name: 'a Kyoto fan', at: 'fanStall', dx: 0, dy: 10, shout: 'Hey!' },
]

export class Item {
  readonly def: ItemDef
  readonly home: Pt
  x: number
  y: number
  gone = false
  /** Seconds until it turns up again after being eaten or sunk. */
  respawn = 0
  /** Stays where it was put, nobody takes it back (the cucumber on the contract board). */
  pinned = false

  constructor(def: ItemDef, home: Pt) {
    this.def = def
    this.home = home
    this.x = home.x
    this.y = home.y
  }

  get kind(): ItemKind {
    return this.def.kind
  }

  get atHome(): boolean {
    return !this.gone && Math.hypot(this.x - this.home.x, this.y - this.home.y) < 2
  }

  reset(): void {
    this.x = this.home.x
    this.y = this.home.y
    this.gone = false
    this.pinned = false
  }
}
