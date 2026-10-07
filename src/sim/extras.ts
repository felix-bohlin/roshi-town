// Passers-by: the anonymous townsfolk who make the streets busy. Each lives behind a real door in
// the neighbourhood that suits them (the town plan records generated houses by neighbourhood) and
// wanders between that neighbourhood's spots, with a trip or two further afield. They're not on the
// map's who's-where list (spec.extra). Generated deterministically from the world.

import { pick, rng, type Rng } from '../engine/rng'
import type { World } from '../world/layout'
import { asleep, home, patrol, spot, type Entry, type Hair, type Hat, type Look, type VillagerSpec } from './types'

/** Hand-placed places that belong to a neighbourhood's wanderings too. */
const NAMED: Record<string, string[]> = {
  town: ['squareWell', 'notice', 'fishStall', 'vegStall', 'fanStall', 'potStall', 'camphor', 'watchtowerFoot', 'riceFront', 'sweetFront', 'clothFront', 'medicineFront', 'bathFront', 'inariFront', 'mainStreetW', 'mainStreetE'],
  samurai: ['samuraiLane', 'castleGateGuard', 'riceFront'],
  crafts: ['smithyFront', 'carpenterFront', 'umbrellaFront', 'southStreetW', 'wallLaneW'],
  inns: ['innFront', 'tofuFront', 'brewFront', 'southStreetE', 'wallLaneE'],
  harbour: ['officeFront', 'warehouseFront', 'tavernFront', 'fishCounter', 'fishCounter2', 'quayW', 'quayE', 'pierMidFoot', 'harbourStreet', 'slipway'],
  temple: ['hondoFront', 'incense', 'graves', 'pagodaFront', 'stairsBottom', 'stairsTop', 'sanmonFront', 'templePond', 'chayaFront', 'waterfall', 'hikeLanding1'],
  approach: ['dangoFront', 'stairsBottom'],
  farm: ['farmRoad', 'gonbeiStep', 'oxGate', 'shrineFront', 'eastRoad', 'riverbank'],
  camp: ['campFireW', 'campFireS', 'campEdge', 'campN', 'farmRoad', 'westRoad'],
  inaba: ['farmRoad', 'gonbeiStep', 'kiyoStep', 'westRoad'],
  hamana: ['netMend', 'quayE', 'pierE', 'beachWestSpot', 'southRoad', 'joshojiFront'],
  okitsu: ['eastRoad', 'shrineFront', 'riverbank'],
}

type Group = keyof typeof NAMED

interface Role {
  title: string
  names: string[]
  /** Neighbourhoods whose houses they live in (from world.homes), or fixed doors. */
  homes: string[]
  /** Where they wander: neighbourhoods, weighted by repetition. */
  haunts: Group[]
  look: (r: Rng) => Look
  talk: string[]
  /** Out in the evening instead of the afternoon (teahouse folk, gamblers). */
  nightOwl?: boolean
  /** How many of the passers-by have this role (relative weight). */
  weight: number
  barks?: string[]
}

const ROBES = ['#5a6a7a', '#7a5a42', '#4a6a5a', '#8a6a4a', '#5a4a6a', '#6a7a8a', '#8a5a5a', '#4a5a7a', '#7a7050', '#9a6a4a', '#5a7a6a']
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(v * 0.75)
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const commoner = (r: Rng, hair: Hair, hat?: Hat, extras: Look['extras'] = []): Look => {
  const robe = pick(r, ROBES)
  return { hair, hat, robe, robeShade: shade(robe), sash: pick(r, ['#3d3449', '#c9b58a', '#2f3f73', '#8a5a3a']), legs: pick(r, ['#3d3449', '#f2c9a0']), collar: '#e8e0cc', extras }
}

const ROLES: Role[] = [
  {
    title: 'townswoman',
    names: ['A townswoman', 'A busy mother', 'A neighbour', 'A housewife with a basket'],
    homes: ['town', 'crafts', 'inns'],
    haunts: ['town', 'town', 'crafts', 'inns', 'harbour'],
    look: (r) => commoner(r, pick(r, ['bun', 'bun', 'grayBun'] as Hair[]), pick(r, [undefined, 'tenugui'] as (Hat | undefined)[])),
    weight: 18,
    talk: [
      'Tofu, radishes, a fish for dinner, and my son, wherever he is. That’s my morning.',
      'Did you hear? Oume says the harbour master is hiding a boat. Oume says a lot of things. Usually true.',
      'A turtle in the street! My grandmother said it means a long life. My grandmother lived to forty.',
      'Don’t go past the west barrier after dark. Those Iga people have nothing. People with nothing… well. You hear things.',
      'When I was a girl you could shout from the manor to the harbour. You still can. Oshio does it every morning.',
    ],
    barks: ['Fresh tofu, or yesterday’s at half price?', 'Taro! TARO! Oh, wrong Taro.', 'Mind the puddle.'],
  },
  {
    title: 'craftsman',
    names: ['A cooper', 'A dyer with blue hands', 'A tatami maker', 'A potter', 'A lacquerer'],
    homes: ['crafts'],
    haunts: ['crafts', 'crafts', 'town', 'harbour'],
    look: (r) => ({ ...commoner(r, 'short', pick(r, ['hachimaki', 'tenugui', undefined] as (Hat | undefined)[]), ['apron']) }),
    weight: 14,
    talk: [
      'I’ve been dyeing indigo for thirty years. My hands will be blue when they bury me. Very fashionable corpse.',
      'A good barrel holds water, sake, or a small samurai. I don’t ask what for.',
      'The manor orders and never pays on time. The fishwives pay on time and never stop talking. I prefer the fishwives.',
    ],
    barks: ['Mind the shavings.', 'Hm. Crooked. Again.'],
  },
  {
    title: 'merchant',
    names: ['A merchant', 'A rice broker', 'A merchant from Sakai', 'A cloth dealer'],
    homes: ['town', 'guests'],
    haunts: ['town', 'town', 'harbour', 'inns'],
    look: (r) => commoner(r, 'topknot', undefined, ['apron']),
    weight: 12,
    talk: [
      'Buy low, sell high, and never lend money to a samurai. Those are the three rules.',
      'Ten coppers for a rumour from Kyoto? I’ll wait. Rumours always get cheaper.',
      'War is very good for business. Not for the people in it. But they aren’t my customers.',
    ],
    barks: ['Twelve mon? Robbery. Eleven.', 'Ledgers, ledgers.'],
  },
  {
    title: 'porter',
    names: ['A porter', 'A dock hand', 'A carrier'],
    homes: ['harbour', 'crafts', 'hamana'],
    haunts: ['harbour', 'harbour', 'town'],
    look: (r) => ({ ...commoner(r, 'short', 'hachimaki'), legs: '#f2c9a0' }),
    weight: 12,
    talk: [
      'Bales, boxes, barrels. If it’s heavy, I’ve carried it. Including a cow, once. Long story.',
      'They pay by the load. I’m paid by the bruise.',
      'My brother marched to Iga with the Oda last autumn. He came back quiet. Doesn’t talk now. Just carries.',
    ],
    barks: ['Hup!', 'Coming through!', 'Mind your shell!'],
  },
  {
    title: 'sailor of the Ise Maru',
    names: ['A sailor', 'A deckhand', 'A sailor on shore leave'],
    homes: ['harbour', 'guests'],
    haunts: ['harbour', 'harbour', 'inns', 'town'],
    look: (r) => ({ ...commoner(r, 'short', 'hachimaki'), robe: '#2f4a6a', robeShade: '#223650', legs: '#f2c9a0' }),
    weight: 8,
    nightOwl: true,
    talk: [
      'Three weeks at sea, three days in port. Guess which one is more dangerous. It’s the tavern.',
      'The captain talks to the ship. The ship doesn’t answer. I trust the ship more.',
      'Sea turtles bring good luck. You’re a little small for a sea turtle. Bring a little luck.',
    ],
  },
  {
    title: 'fisherman',
    names: ['A fisherman', 'An old fisherman', 'A net mender'],
    homes: ['harbour', 'hamana'],
    haunts: ['harbour', 'hamana', 'hamana', 'town'],
    look: (r) => ({ ...commoner(r, pick(r, ['short', 'bald'] as Hair[]), pick(r, ['kasa', 'tenugui'] as Hat[]), ['creel']), legs: '#f2c9a0' }),
    weight: 8,
    talk: ['The sea gives, the sea takes, the fish market takes a cut.', 'Bonito running early this year. The sea’s in a good mood. Enjoy it while it lasts.'],
  },
  {
    title: 'pilgrim to Kōun-ji',
    names: ['A pilgrim', 'A tired pilgrim', 'A pilgrim from Owari', 'A pilgrim with a walking staff'],
    homes: ['guests'],
    haunts: ['temple', 'temple', 'approach', 'town'],
    look: (r) => ({ hair: 'short', hat: 'kasa', robe: '#ece6d6', robeShade: '#c8c0aa', sash: pick(r, ['#c0262f', '#2f3f73']), legs: '#ece6d6', collar: '#ece6d6' }),
    weight: 12,
    talk: [
      'One thousand and eighty-two steps. I counted one thousand and eighty-three. Either I’m wrong or the temple is growing.',
      'I walked from Owari to pray for my husband’s back. Now my back needs praying for.',
      'They say if you rub the turtle’s shell you get ten thousand years. …May I? No? Fair.',
      'The view from the halfway teahouse! The whole valley, every village, the sea. Worth every step. Most of the steps.',
    ],
    barks: ['*huff* …*huff*', 'Namu Amida Butsu…', 'Only five hundred more. Only five hundred more.'],
  },
  {
    title: 'samurai retainer',
    names: ['A retainer', 'A young samurai', 'A samurai on an errand'],
    homes: ['samurai'],
    haunts: ['samurai', 'samurai', 'town', 'temple'],
    look: (r) => ({ ...commoner(r, 'topknot', undefined, ['swords', 'hakama']), robe: pick(r, ['#3a4a6a', '#4a3a3a', '#2f3f3f']), robeShade: '#2a2a33' }),
    weight: 8,
    talk: ['I carry two swords, a fan and my lord’s laundry list. Guess which one I use most.', 'A turtle. On the samurai lane. Do you have an appointment?'],
  },
  {
    title: 'Oda foot soldier',
    names: ['A foot soldier', 'An ashigaru', 'A bored spearman'],
    homes: ['door:barracks', 'door:castle'],
    haunts: ['town', 'harbour', 'camp', 'samurai'],
    look: (r) => ({ ...commoner(r, 'short', 'jingasa', ['armor']), robe: '#3a3a42', robeShade: '#2a2a30' }),
    weight: 7,
    talk: [
      'Move along, turtle. Orders.',
      'Lord Nobunaga’s peace is upon the land. That’s why I carry a spear.',
      'We’re to look out for Iga men. Problem is, they look like everyone. So we just look at everyone.',
      'A kappa in the moat? If it’s not on my list, it’s not my problem.',
    ],
  },
  {
    title: 'rōnin (between lords)',
    names: ['A rōnin', 'A masterless samurai', 'A scruffy rōnin'],
    homes: ['guests', 'crafts'],
    haunts: ['inns', 'harbour', 'town'],
    look: (r) => ({ ...commoner(r, 'topknot'), robe: '#4a4a4a', robeShade: '#363636', extras: ['swords'] }),
    weight: 5,
    nightOwl: true,
    talk: [
      'My lord fell, my house fell, my sandals are next. I am a rōnin. It means "wave man". I go where I’m pushed.',
      'I’m not lurking. I’m waiting with intent.',
      'I have killed eleven men. None of them were my idea.',
    ],
  },
  {
    title: 'gambler',
    names: ['A gambler', 'A dice man', 'A man with a scar and a smile'],
    homes: ['inns', 'hamana'],
    haunts: ['inns', 'hamana', 'harbour'],
    look: (r) => ({ ...commoner(r, 'short', undefined), robe: pick(r, ['#5a2a2a', '#2a2a2a', '#4a3a5a']), robeShade: '#1e1a1e' }),
    weight: 4,
    nightOwl: true,
    talk: [
      'Odd or even, turtle? …You don’t have money. You don’t have pockets. You’re no fun.',
      'The dice are honest. The men are not. I prefer the dice.',
      'I owe the brewer, the brewer owes the manor, the manor owes Nobunaga. Everybody owes somebody. Relax.',
    ],
    barks: ['Cho or han?', 'Lucky turtle? Let me rub— no? Fine.'],
  },
  {
    title: 'pickpocket',
    names: ['A quick-fingered boy', 'A smiling stranger', 'A girl with very busy hands'],
    homes: ['crafts', 'harbour'],
    haunts: ['town', 'town', 'harbour'],
    look: (r) => ({ ...commoner(r, pick(r, ['kidBoy', 'short'] as Hair[]), 'tenugui'), robe: '#4a4438', robeShade: '#36322a' }),
    weight: 3,
    talk: ['I wasn’t touching his purse. I was admiring it. Closely. With my hand.', 'You’ve got nothing worth taking, turtle. I can tell. It’s a gift.'],
  },
  {
    title: 'teahouse musician',
    names: ['A shamisen player', 'A teahouse singer', 'A young musician'],
    homes: ['inns'],
    haunts: ['inns', 'inns', 'town'],
    look: (r) => ({ hair: 'bun', robe: pick(r, ['#8a3a5a', '#3a5a8a', '#6a3a7a']), robeShade: '#3a2a3a', sash: '#e0b13c', legs: '#ece6d6', collar: '#f2e8d8' }),
    weight: 4,
    nightOwl: true,
    talk: [
      'I play at the teahouses by the pond from dusk till the lanterns gutter. The song about the willow and the moon makes the samurai cry. I charge extra for that one.',
      'A turtle! Sit, sit. I know a song about a turtle who carried a fisherman to the palace under the sea. It ends badly. Most good songs do.',
    ],
    barks: ['♪ …the willow bends, the moon does not… ♪', '*tuning the shamisen*'],
  },
  {
    title: 'flower seller',
    names: ['A flower seller', 'A girl with an armful of irises'],
    homes: ['crafts', 'town'],
    haunts: ['town', 'inns', 'temple'],
    look: (r) => ({ ...commoner(r, 'kidGirl', 'tenugui'), kid: true, legs: '#f2c9a0' }),
    weight: 4,
    talk: ['Irises for the temple, hydrangeas for the house, morning glories for the very patient.', 'One flower for one smile. You’re a turtle. Half a flower, then.'],
    barks: ['Flowers! Irises from the river!', 'Hydrangeas, blue as the sea!'],
  },
  {
    title: 'old townsman',
    names: ['An old man', 'A retired cooper', 'A grandfather', 'An old woman with a stick'],
    homes: ['crafts', 'town', 'inns'],
    haunts: ['town', 'temple', 'inns'],
    look: (r) => ({ ...commoner(r, 'grayBun'), extras: ['beard'] }),
    weight: 7,
    talk: [
      'In my day the duck pond was full of eels. Now it’s full of ducks. Progress.',
      'I climb to the temple every week to remind the Buddha I’m still here. Takes me all morning. He waits.',
      'I’ve seen four lords take that manor. Every one said he’d be the last. Two of them were right, in a way.',
    ],
  },
  {
    title: 'town child',
    names: ['A child', 'A small boy', 'A small girl', 'A boy with a kite'],
    homes: ['crafts', 'inns', 'town'],
    haunts: ['town', 'crafts', 'harbour'],
    look: (r) => ({ ...commoner(r, pick(r, ['kidBoy', 'kidGirl'] as Hair[])), kid: true, legs: '#f2c9a0' }),
    weight: 10,
    talk: [
      'Are you a kappa? Kappas live in the moat and pull your soul out through your bottom. Mum said. Are you a kappa?',
      'Hachi says you’re a ninja turtle. That’s silly. Ninjas aren’t turtles. …Are they?',
    ],
    barks: ['Tag! You’re it!', 'Race you to the well!', 'Kappa! KAPPA! …oh, a turtle.'],
  },
  {
    title: 'refugee from Iga',
    names: ['A refugee', 'A thin woman', 'A man from Iga'],
    homes: ['door:tentA', 'door:tentB', 'door:tentC', 'door:tentD', 'door:tentE'],
    haunts: ['camp', 'camp', 'farm', 'town'],
    look: (r) => ({ ...commoner(r, pick(r, ['short', 'bun', 'grayBun'] as Hair[]), pick(r, [undefined, 'tenugui'] as (Hat | undefined)[])), robe: '#5e574a', robeShade: '#463f36', sash: '#2a2420', legs: '#463f36' }),
    weight: 5,
    talk: [
      'We walked here from Iga. Nine days. We had a cart. Then we had a cart’s worth of things on our backs. Then we didn’t.',
      'The farmers let us glean the paddy edges. Gonbei’s wife leaves a little extra. She thinks we don’t notice.',
      'Don’t look at me like that, turtle. You carry your house on your back. I envy you.',
    ],
  },
  {
    title: 'wandering monk',
    names: ['A wandering monk', 'A begging monk', 'A young monk'],
    homes: ['door:kuri'],
    haunts: ['temple', 'temple', 'town', 'approach'],
    look: () => ({ hair: 'bald', hat: 'kasa', robe: '#2a2233', robeShade: '#1a1622', sash: '#c9a040', legs: '#2a2233', collar: '#e8e0cc', extras: ['kesa'] }),
    weight: 5,
    talk: ['I walk from temple to temple. Every road is the right road. Some are just longer. The one up this mountain is very long.', 'Alms? …You are a turtle. Never mind. Bless you, turtle.'],
  },
  {
    title: 'villager',
    names: ['A villager', 'A farmer’s wife', 'A fisherman’s daughter', 'An old villager'],
    homes: ['inaba', 'hamana', 'okitsu'],
    haunts: ['inaba', 'hamana', 'okitsu'],
    look: (r) => ({ ...commoner(r, pick(r, ['short', 'bun', 'grayBun'] as Hair[]), pick(r, ['kasa', 'tenugui', undefined] as (Hat | undefined)[])), legs: '#f2c9a0' }),
    weight: 10,
    talk: [
      'Kumoi? Too many people, too many stairs, too many samurai. We go once a month to sell and once a year to pray.',
      'The Kumoi folk think we’re simple. We think they’re loud. We’re both right.',
      'A turtle all the way out here? Did Kumoi get too much for you too?',
    ],
    barks: ['Morning!', 'Rain later, my knee says.'],
  },
  {
    title: 'farmhand',
    names: ['A farmhand', 'A young farmer', 'A woman with a hoe'],
    homes: ['door:farmB', 'door:farmC', 'door:gonbei', 'door:kiyo'],
    haunts: ['farm', 'farm', 'camp', 'town'],
    look: (r) => ({ ...commoner(r, pick(r, ['short', 'bun'] as Hair[]), 'kasa'), legs: '#f2c9a0' }),
    weight: 5,
    talk: ['Rice in the paddies, crows in the rice, and the steward in the storehouse counting it all.', 'Kumoi eats everything we grow and asks why it’s muddy.'],
  },
]

const NO_SHELL = ['Huh. A rock with a scarf.', 'Is that a rock? …Is that rock looking at me?', 'Nice rock.', 'KAPPA! …No. A rock. Sorry, rock.']
const TURTLE = ['A turtle! In town!', 'Oh! Mind the turtle!', 'Look, a turtle! Lucky!', 'Is that… a turtle in a scarf?', 'Is that a kappa? Keep it away from the pond!']

/** Pick a home door for a role: a fixed door, or a house in one of its neighbourhoods. */
function homeFor(world: World, r: Rng, role: Role): string {
  const doors = role.homes.flatMap((h) => (h.startsWith('door:') ? (world.places[h] ? [h] : []) : world.homes[h] ?? []))
  return doors.length ? pick(r, doors) : 'westEdge'
}

/** The neighbourhood a home door belongs to, if it's one the role wanders. */
function homeGroup(world: World, role: Role, door: string): Group | null {
  for (const g of role.haunts) if (world.homes[g]?.includes(door)) return g
  return null
}

function route(world: World, r: Rng, role: Role, n: number, local: Group | null): string[] {
  const out: string[] = []
  const home = local ?? pick(r, role.haunts)
  for (let k = 0; k < n; k++) {
    // Mostly their own neighbourhood; now and then somewhere else they go (villagers stay home).
    const g = r() < (role.title === 'villager' ? 1 : 0.7) ? home : pick(r, role.haunts)
    const pool = [...(world.spots[g] ?? []), ...NAMED[g].filter((p) => world.places[p])]
    if (pool.length) out.push(pick(r, pool))
  }
  return out
}

const STALL_CALLS = [
  'Fresh fish! Fresh-ish fish! Fish!',
  'Radishes as long as your arm! Longer than a turtle!',
  'Bowls, cups, pots! Only slightly cursed!',
  'Fans from Kyoto! Cool air, hot prices!',
  'Pickles! Sour enough to wake the dead! The dead have complained!',
  'Straw sandals! One pair for the road, one for the road back!',
]

/** Stallholders: one per market stall, there from early morning to late afternoon. */
function stallholders(world: World, r: Rng): VillagerSpec[] {
  const stalls = world.spots.stalls ?? []
  const homes = [...(world.homes.town ?? []), ...(world.homes.crafts ?? [])]
  return stalls.map((at, i) => {
    const look = commoner(r, pick(r, ['bun', 'short', 'grayBun', 'topknot'] as Hair[]), pick(r, ['tenugui', 'hachimaki', undefined] as (Hat | undefined)[]), ['apron'])
    return {
      id: `stall${i}`,
      name: pick(r, ['A stallholder', 'A market woman', 'A pickle seller', 'A sandal seller', 'A potter at her stall']),
      title: 'stallholder',
      home: homes.length ? pick(r, homes) : 'westEdge',
      look,
      color: '#8a8070',
      speed: 26 + Math.floor(r() * 6),
      schedule: [
        asleep(),
        { at: `0${6 + Math.floor(r() * 2)}:${String(Math.floor(r() * 5) * 10).padStart(2, '0')}`, label: 'minding the stall', doing: spot(at, 'call') },
        home(`${16 + Math.floor(r() * 3)}:30`, 'counting the day’s coins'),
        asleep('21:30'),
      ],
      talk: [
        'Buying? No? Then stop leaning on the radishes.',
        'Market day is every third day, but I’m here every day. Jinbei only brings the rumours. I am the rumours.',
        'A turtle came by last year and ate a whole cucumber. Was that you? It was you.',
      ],
      turtle: TURTLE,
      shell: NO_SHELL,
      barks: { call: STALL_CALLS, shop: STALL_CALLS },
      extra: true,
    }
  })
}

export function makeExtras(world: World, count = 75): VillagerSpec[] {
  const r = rng(1600)
  const total = ROLES.reduce((a, b) => a + b.weight, 0)
  const out: VillagerSpec[] = stallholders(world, r)
  count -= out.length
  for (let i = 0; i < count; i++) {
    // Deal roles out in proportion to their weights, interleaved.
    let k = ((i * 7919) % total) + 0.5
    let role = ROLES[0]
    for (const rl of ROLES) {
      if (k < rl.weight) {
        role = rl
        break
      }
      k -= rl.weight
    }
    const look = role.look(r)
    const homeAt = homeFor(world, r, role)
    const local = homeGroup(world, role, homeAt)
    const min = () => String(Math.floor(r() * 6) * 10).padStart(2, '0')
    const wait = () => 4 + Math.floor(r() * 10)
    const schedule: Entry[] = role.nightOwl
      ? [
          { at: '00:00', label: 'out late', doing: patrol(route(world, r, role, 5, local), undefined, 'stand', wait()) },
          asleep(`0${1 + Math.floor(r() * 2)}:${min()}`),
          { at: `${10 + Math.floor(r() * 2)}:${min()}`, label: 'out and about', doing: patrol(route(world, r, role, 5, local), undefined, 'stand', wait()) },
          home(`${14 + Math.floor(r() * 2)}:${min()}`, 'resting'),
          { at: `${17 + Math.floor(r() * 2)}:${min()}`, label: 'out for the evening', doing: patrol(route(world, r, role, 6, local), undefined, 'stand', wait()) },
        ]
      : [
          asleep(),
          { at: `0${5 + Math.floor(r() * 4)}:${min()}`, label: 'out and about', doing: patrol(route(world, r, role, 6, local), undefined, 'stand', wait()) },
          home(`${11 + Math.floor(r() * 2)}:${min()}`, 'lunch'),
          { at: `${12 + Math.floor(r() * 2)}:${min()}`, label: 'out and about', doing: patrol(route(world, r, role, 6, local), undefined, 'stand', wait()) },
          home(`${17 + Math.floor(r() * 3)}:${min()}`),
          asleep(`2${Math.floor(r() * 3)}:00`),
        ]
    out.push({
      id: `extra${i}`,
      name: pick(r, role.names),
      title: role.title,
      home: homeAt,
      look,
      color: '#8a8070',
      speed: look.kid ? 38 : 24 + Math.floor(r() * 10),
      schedule,
      talk: role.talk,
      turtle: TURTLE,
      shell: NO_SHELL,
      barks: role.barks ? { walk: role.barks, stand: role.barks } : {},
      extra: true,
    })
  }
  return out
}
