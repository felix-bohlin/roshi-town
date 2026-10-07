# Shell of Iga — village prototype

A 2D open-world prototype. You are Kame, Master Roshi's errand turtle, sent from his island to the
Kumoi valley (Ise Province, early summer 1582) to fetch "the good sake" from the brewery in the village.
There is no quest logic yet: it's a valley of villages to wander and get a feel for, laid out in the
spirit of Stardew Valley.

The tone is warm with a bit of grit: shady people a year after Nobunaga burned Iga, refugees camped on
the common, a burnt-out house nobody talks about, contracts for kappa and nue on the notice board, and
Roshi still mostly worried about sake prices. And plenty of beauty: golden mornings, lanterns round the
duck pond at dusk, a tunnel of torii up the mountain, and a koto tune.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # typecheck + layout check (every door, spot and schedule target reachable)
pnpm build
```

**Controls:** WASD/arrows walk · Shift hurry · Space hide in shell · E talk/look · M map with who's where ·
`[` `]` time speed · P pause · R weather (as it comes / rain / storm / mist / clear) · N sound · G debug view ·
H help. On touch screens: drag to walk, tap to talk, double-tap to hide.

## What's in it

- **The valley** (240×200 tiles): a handful of villages between the mountain and the sea, laid out by hand
  and joined by dirt roads, with a barrier and a guard hut on each road into Kumoi.
  - **Kumoi**, the market village: a paved square with market stalls, Oume's teahouse and the shops round
    it, the inn and Kurozaemon's brewery on the east road, the craftsmen's lane, row houses, a duck pond.
  - **The manor** of the absent lord in its moat, and the samurai lane down to the square.
  - **Inaba**, the farming hamlet west along the road: Gonbei's and Kiyo's farms, the chicken yard and the
    ox pen, terraced paddies and vegetable fields; the Iga refugee camp on the common nearer Kumoi.
  - **Hamana**, the harbour village on the shore: the quay and piers, the fish market, the Drunken Octopus,
    the shipwright, fishermen's huts, Jōshō-ji, the merchant ship and a lighthouse on the breakwater.
  - **Okitsu**, the post village over the river bridge on the road east, with its inn and paddies; up the
    river in the woods, the old Kumoi shrine.
  - **Roshi's island** out in the bay, where you start.

  Village houses get a garden each (a vegetable patch, a flower bed or a fruit tree) and a footpath to the
  road; shop doors get potted plants.
- **The thousand steps:** Kōun-ji sits on the mountain above the valley, about 140 tiles of switchback path
  above the temple village: the great torii, the six Jizō, a tunnel of vermilion torii, a waterfall pool,
  the halfway teahouse with a view over the whole valley, and finally the temple gate, main hall, pagoda,
  bell and graveyard. Stairs slow everyone down; the turtle huffs.
- **120 people:** 45 with their own routines and lines (`src/sim/folk-*.ts`), plus 75 generated passers-by
  (`src/sim/extras.ts`) who live behind real doors in the right village: stallholders, porters, sailors,
  fishermen, pilgrims climbing the steps, samurai retainers, foot soldiers, rōnin, gamblers and
  pickpockets, teahouse musicians, flower sellers, children, refugees, monks.
- **Animals:** chickens, ducks on the pond and the manor moat, cats with favourite spots, Pochi the dog,
  Benkei the ox, temple deer that bow, seagulls, frogs at night, crows that pull up seedlings or watch from
  the rooftops, and harbour rats that come out at dusk and in the rain.
- **Weather and light:** a seeded plan per day (dawn sea mist, rain spells, the odd thunderstorm with
  lightning and taiko thunder), rain streaks, splashes and rings on water and puddles, paper umbrellas,
  drifting fog, warm golden mornings and evenings, dark nights where lanterns, windows and campfires
  matter. Bright, clean colours on a fine day; a soft grade that greys out in the rain.
- **Music:** a generated koto tune in the bright yō scale over a plucked bass, slower at night.
- **The turtle** swims (faster than it walks) and can hide in its shell. Most people then see a rock; some
  see a kappa.

## How it's built

TypeScript + Canvas 2D + Vite, no runtime dependencies. All art is drawn by code into small canvases at
startup, with a light touch of weathering. Generated houses of the same shape share one image; the ground
is painted in 32×32-tile chunks as they come into view. Music and sound are synthesized with Web Audio;
there are no asset files.

| Path | What |
|---|---|
| `src/engine/` | Screen (low-res world canvas scaled by an integer and colour-graded; full-res UI canvas), input, A*, RNG, pixel helpers |
| `src/world/` | the map: `town.ts` (order of building, wild trees), `valley.ts` (the land, roads, every village, gardens, districts), `mountain.ts` (the steps and the temple); `shape.ts` (noisy polygons, blobs, lines) and `organic.ts` (bridges, gates, packing houses along the lanes, yards) are helpers; `plan.ts` lot makers; `layout.ts` the data model and builder (pure data); `grid.ts` collision and path costs |
| `src/sim/` | villagers' schedules and lines (`folk-*.ts`), generated passers-by, game clock |
| `src/entities/` | villager timetable runner, animal brains, the turtle |
| `src/art/` | ground, buildings (`kit.ts` parts, `townhouses.ts`, `landmarks.ts`, `camp.ts`), props, nature, people (paper dolls), animals |
| `src/weather.ts` | daily weather plan, rain, fog, lightning, colour grade |
| `src/lighting.ts` | ambient light by hour and the stepped light map |
| `src/game.ts` | update loop, y-sorted rendering, water, lighting, interaction |
| `src/ui/` | speech bubbles, HUD, district banner, dialogue box, title card, map, help |
| `src/audio/` | koto music, temple bell, rain and thunder |

The simulation (`world/`, `sim/`) has no DOM dependency, so `scripts/check.ts` validates the valley in Node.
In the browser console, `game` is the live game object (e.g. `game.clock.minutes = 20 * 60`,
`game.weather.mode = 'storm'`).
