# Shell of Iga — town prototype

A 2D open-world prototype. You are Kame, Master Roshi's errand turtle,
sent from his island to the walled port city of Kumoi (Ise Province, early summer 1582) to fetch "the
good sake". There is no quest logic yet: it's a city to walk around in and get a feel for.

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

**Controls:** WASD/arrows walk · Shift hurry · Space hide in shell · E talk/look · M map with who's where ·
`[` `]` time speed · P pause · R weather (as it comes / rain / storm / mist / clear) · N sound · G debug view ·
H help. On touch screens: drag to walk, tap to talk, double-tap to hide.

## What's in it

- **Kumoi** (288×224 tiles): a walled city in its moat, about 190 by 85 tiles inside the walls. A paved
  grand avenue runs from the North Gate to the Sea Gate and a wide main street from the West Gate to the
  East Gate; around them, streets of every width down to one-tile alleys, lined with generated townhouses,
  shops, row houses, workshops, inns and teahouses. Quarters: samurai residences, the merchant quarter,
  shop row, the craftsmen's quarter with its neighbourhood temple, inn and brewery street, the Willow
  Canal with its bridges and teahouses, and the castle inside its own moat. The town square is a market.
- **The thousand steps:** Kōun-ji sits on the mountain north of the city, about 140 tiles of switchback
  path above the temple town: the great torii, the six Jizō, a tunnel of vermilion torii, a waterfall
  pool, the halfway teahouse with a view over the whole city, and finally the temple gate, main hall,
  pagoda, bell and graveyard. Stairs slow everyone down; the turtle huffs.
- **Outside the walls:** rice terraces and farms, the Iga refugee camp, a fishing village, the harbour with
  its piers, merchant ship and lighthouse, the river and woods with an old shrine, beaches, and Roshi's
  island, where you start.
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
- **The turtle** swims (faster than it walks) and can hide in its shell. Most people then see a rock; some
  see a kappa.

## How it's built

TypeScript + Canvas 2D + Vite, no runtime dependencies. All art is drawn by code into small canvases at
startup, then weathered (grime, rain streaks, mud splashes) and muted. Generated houses of the same shape
share one image; the ground is painted in 32×32-tile chunks as they come into view. Music and sound are synthesized
with Web Audio; there are no asset files.

| Path | What |
|---|---|
| `src/engine/` | Screen (low-res world canvas scaled by an integer and colour-graded; full-res UI canvas), input, A*, RNG, pixel helpers |
| `src/world/` | the town plan: `town.ts` (terrain, districts, nature), `city.ts`, `mountain.ts`, `harbour.ts`, `outskirts.ts`, with `plan.ts` (shared coordinates and the generator that lines streets with houses); `layout.ts` the data model and builder (pure data); `grid.ts` collision and path costs |
| `src/sim/` | villagers' schedules and lines (`folk-*.ts`), generated passers-by, game clock |
| `src/entities/` | villager timetable runner, animal brains, the turtle |
| `src/art/` | ground, buildings (`kit.ts` parts, `townhouses.ts`, `landmarks.ts`, `camp.ts`), props, nature, people (paper dolls), animals |
| `src/weather.ts` | daily weather plan, rain, fog, lightning, colour grade |
| `src/lighting.ts` | ambient light by hour and the stepped light map |
| `src/game.ts` | update loop, y-sorted rendering, water, lighting, interaction |
| `src/ui/` | speech bubbles, HUD, district banner, dialogue box, title card, map, help |
| `src/audio/` | koto music, temple bell, rain and thunder |

The simulation (`world/`, `sim/`) has no DOM dependency, so `scripts/check.ts` validates the town in Node.
In the browser console, `game` is the live game object (e.g. `game.clock.minutes = 20 * 60`,
`game.weather.mode = 'storm'`).
