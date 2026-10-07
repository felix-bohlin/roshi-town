# Shell of Iga — town prototype

A 2D open-world prototype. You are Kame, Master Roshi's errand turtle,
sent from his island to the walled port city of Kumoi (Ise Province, early summer 1582) to fetch "the
good sake". Kurozaemon the brewer won't sell it to a turtle, so Roshi wrote you a list instead: small,
petty acts of mischief around town, in the spirit of a certain goose.

The tone is gritty but not grim: muddy streets and shady people a year after Nobunaga burned Iga,
refugees camped outside the walls, a burnt-out house nobody talks about, contracts for kappa and nue on
the notice board, and Roshi still mostly worried about sake prices. But there is beauty too: golden
mornings, lanterns on the Willow Canal at dusk, a tunnel of torii up the mountain, and a koto tune.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # typecheck + layout check (every door, spot and schedule target reachable)
pnpm build
```

**Controls:** WASD/arrows walk · Shift hurry · Space hide in shell · E talk/look/ring · F snap (grab, drop,
eat, bite) · Tab to-do list · M map with who's where · `[` `]` time speed · P pause · R weather (as it comes /
rain / storm / mist / clear) · N sound · G debug view · H help. On touch screens: drag to walk, tap to talk,
double-tap to hide, long-press to snap.

## What's in it

- **Kumoi** (on a 400×320-tile map): an organic walled port city spread over islands, after a reference
  map. The castle sits in its own moat on the north island; a causeway lined with houses runs down to the
  Sea Gate; the central island holds the market square, the merchant and samurai quarters, the inns and
  the brewery; the Willow Canal cuts across it under three bridges; a harbour arm curls round the basin
  with its piers, merchant ship and lighthouse; and across a diagonal channel lies Shiomachi, the
  fishermen's and shipwrights' district. Streets are grown, not drawn: noisy paths between landmarks,
  from wide paved streets down to one-tile alleys, packed with generated townhouses, row houses, shops,
  storehouses and courtyards. Sea walls with towers follow the coast and gates stand at every bridge.
- **The thousand steps:** Kōun-ji sits on the mountain north-east of the city, about 140 tiles of switchback
  path above the temple town: the great torii, the six Jizō, a tunnel of vermilion torii, a waterfall
  pool, the halfway teahouse with a view over the whole city, and finally the temple gate, main hall,
  pagoda, bell and graveyard. Stairs slow everyone down; the turtle huffs.
- **Neighbouring villages** on the forested mainland, joined by country roads: Inaba with its farms, rice
  paddies and the Iga refugee camp; Hamana, a fishing village on the beach with an Ebisu shrine; and
  Okitsu, a post-road village with an inn. A river runs down from the hills past an old shrine in the
  woods, and Roshi's island, where you start, is out in the bay.
- **Mischief:** a to-do list of fourteen jobs (Tab), crossed off in brush ink as you do them, kept in
  local storage. Steal Sanpei's left sandal and drop it down a well, eat Oume's dango, feed a stolen fish
  to the harbour cats, trip people and get sat on while you hide in your shell (then stand up), surface
  from the canal and be taken for a kappa, bite a samurai on the toe, ring the fire bell and watch the
  street empty, bring the kappa contract on the notice board its cucumber, and finally steal the good sake
  and carry it home. Owners notice you within a few tiles and give chase (faster than you walk; slower than
  you swim); hide in your shell and they search, give up and go back to what they were doing. Dropped
  things are fetched home again.
- **200 people:** 45 with their own routines and lines (`src/sim/folk-*.ts`), plus 155 generated
  passers-by (`src/sim/extras.ts`) who live behind real doors in the right neighbourhood: stallholders,
  porters, sailors, fishermen, pilgrims climbing the steps, samurai retainers, foot soldiers, rōnin,
  gamblers and pickpockets, teahouse musicians, flower sellers, children, refugees, monks.
- **Animals:** chickens, ducks on the moat, cats with favourite spots, Pochi the dog, Benkei the ox, temple
  deer that bow, seagulls, frogs at night, crows that pull up seedlings or watch from the rooftops, and harbour
  rats that come out at dusk and in the rain.
- **Weather and light:** a seeded plan per day (dawn sea mist, rain spells, the odd thunderstorm with
  lightning and taiko thunder), rain streaks, splashes and rings on water and puddles, paper umbrellas,
  drifting fog, warm golden mornings and evenings, dark nights where lanterns, windows and campfires
  matter, and a soft colour grade that greys out in the rain.
- **Music:** a generated koto tune in the bright yō scale over a plucked bass, slower at night.
- **Why a turtle:** it's built for this. It swims faster than anyone can run, so the canals and the
  harbour are escape routes; in its shell it's a rock, which people trip over, sit on and lose track of;
  coming out of the water it's a kappa; and it snaps.

## How it's built

TypeScript + Canvas 2D + Vite, no runtime dependencies. All art is drawn by code into small canvases at
startup, then weathered (grime, rain streaks, mud splashes) and muted. Generated houses of the same shape
share one image; the ground is painted in 32×32-tile chunks as they come into view. Music and sound are synthesized
with Web Audio; there are no asset files.

| Path | What |
|---|---|
| `src/engine/` | Screen (low-res world canvas scaled by an integer and colour-graded; full-res UI canvas), input, A*, RNG, pixel helpers |
| `src/world/` | the map: `town.ts` (order of building, districts, nature), `kumoi.ts` (the city), `villages.ts` (mainland, villages, river, island), `mountain.ts` (the steps and temple); `shape.ts` (noisy polygons, blobs, lines) and `organic.ts` (bridges, gates, sea walls, docks, grown streets, lot packing, yards, reachability pruning) are the generator; `plan.ts` shared lot makers; `layout.ts` the data model and builder (pure data); `grid.ts` collision and path costs |
| `src/mischief/` | items and their owners, the to-do list, and the rules: who notices, chases, searches, trips, sits, flees |
| `src/sim/` | villagers' schedules and lines (`folk-*.ts`), generated passers-by, game clock |
| `src/entities/` | villager timetable runner, animal brains, the turtle |
| `src/art/` | ground, buildings (`kit.ts` parts, `townhouses.ts`, `landmarks.ts`, `camp.ts`), props, nature, people (paper dolls), animals |
| `src/weather.ts` | daily weather plan, rain, fog, lightning, colour grade |
| `src/lighting.ts` | ambient light by hour and the stepped light map |
| `src/game.ts` | update loop, y-sorted rendering, water, lighting, interaction |
| `src/ui/` | speech bubbles, HUD, district banner, dialogue box, title card, map, help, the to-do notepad |
| `src/audio/` | koto music, temple and fire bells, chimes, rain and thunder |

The simulation (`world/`, `sim/`) has no DOM dependency, so `scripts/check.ts` validates the town in Node.
In the browser console, `game` is the live game object (e.g. `game.clock.minutes = 20 * 60`,
`game.weather.mode = 'storm'`).
