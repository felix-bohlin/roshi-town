// Mischief: what the turtle gets up to, and how Kumoi takes it.
//
//   snap (F)  grab a thing in your jaws, drop it again, eat it if it's edible, or bite a toe
//   owners    who see you with their thing come after you; touch you and they take it back; hide
//             in your shell and they lose you ("…just a rock?"); swim off and they give up
//   the shell people walking past trip over you; people sitting down sit on you (and get a fright
//             when the rock stands up)
//   water     climb out right next to someone and they see a kappa
//   bells     the fire watchtower bell and the temple bell can be rung by a determined turtle
//
// Everything that happens is reported to the to-do list (mischief/todo.ts).

import { itemSprite } from '../art/items'
import { playBell, playChime, playFireBell } from '../audio/bell'
import { ellipse, type Ctx } from '../engine/pixel'
import { pick, rng } from '../engine/rng'
import type { Villager } from '../entities/villager'
import type { Game } from '../game'
import { tileFeet } from '../world/grid'
import { TILE } from '../world/layout'
import { Item, ITEM_DEFS } from './items'
import { Todo, type MischiefEvent } from './todo'

const TRIP = ['WHO PUT A ROCK HERE?!', 'Ow! My… everything!', 'That rock tripped me. On PURPOSE.', 'Gah! The ground attacked me!']
const SIT = ['Ahh. A nice warm rock.', 'What a comfortable rock. Smooth. Round. Breathing slightly.', 'Mm. Good rock.']
const UNSEAT = ['AIEEE! THE ROCK MOVED!', 'The rock is ALIVE!', 'I was sitting on a TURTLE?!']
const KAPPA = ['KAPPA!! A KAPPA!!', 'Kappa! Mind your bottoms!', 'AAAH! It came out of the water! KAPPA!']
const BITE = ['OW! My toe!', 'Ow! It BIT me!', 'Get off my sandal, you menace!']
const FIRE = ['FIRE?! WHERE?!', 'Fire! Get the buckets!', 'Is it a fire? Is it an earthquake? Is it a carp?', 'Everyone out! …Wait, out of what?']

export class Mischief {
  readonly items: Item[] = []
  readonly todo = new Todo()
  carried: Item | null = null
  private g: Game
  private chasedBy = new Set<string>()
  private tripAt = new Map<string, number>()
  private sitters = new Set<Villager>()
  private r = rng(4242)

  constructor(g: Game) {
    this.g = g
    for (const def of ITEM_DEFS) {
      const p = g.world.places[def.at]
      if (!p) continue
      const f = tileFeet(p)
      this.items.push(new Item(def, { x: f.x + (def.dx ?? 0), y: f.y + (def.dy ?? 0) }))
    }
  }

  report(e: MischiefEvent): void {
    const crossed = this.todo.record(e, this.g.time)
    for (const text of crossed) {
      this.g.speech.floater(this.g.player.x, this.g.player.y - 34, `✓ ${text}`, '#e0b13c')
      if (this.g.musicOn) playChime()
    }
  }

  private owner(item: Item): Villager | undefined {
    return item.def.owner ? this.g.villagers.find((v) => v.id === item.def.owner) : undefined
  }

  /** Is the item where you can see it? (The good sake is locked away at night.) */
  visible(item: Item): boolean {
    if (item.gone) return false
    if (this.carried === item || !item.atHome || !item.def.hours) return true
    return this.g.clock.between(item.def.hours[0], item.def.hours[1])
  }

  private startChase(v: Villager, item: Item): void {
    v.chase(this.g, item, item.def.shout)
    this.chasedBy.add(v.id)
    this.report({ kind: 'chased', who: v.id, count: this.chasedBy.size })
  }

  update(dt: number): void {
    const g = this.g
    const p = g.player
    for (const it of this.items)
      if (it.gone) {
        it.respawn -= dt
        if (it.respawn <= 0) it.reset()
      }
    if (this.carried) {
      this.carried.x = p.x
      this.carried.y = p.y
      const v = this.owner(this.carried)
      if (v && !v.inside && !v.busy && !p.hidden && Math.hypot(v.x - p.x, v.y - p.y) < 96) this.startChase(v, this.carried)
    }
    // Owners fetch their things back when they find them lying about.
    for (const it of this.items) {
      if (it === this.carried || it.gone || it.atHome || it.pinned) continue
      const v = this.owner(it)
      if (v && !v.inside && !v.busy && Math.hypot(v.x - it.x, v.y - it.y) < 64) v.chase(g, it, 'There it is! Who left my things lying about?')
    }
    if (!p.hidden) return
    for (const v of g.villagers) {
      if (v.inside || v.busy) continue
      const d = Math.hypot(v.x - p.x, v.y - p.y)
      if (v.isMoving && d < 8 && g.time - (this.tripAt.get(v.id) ?? -99) > 10) {
        this.tripAt.set(v.id, g.time)
        v.fall(g, pick(this.r, TRIP))
        this.report({ kind: 'trip', who: v.id })
      } else if (v.isSitting() && d < 10 && !this.sitters.has(v)) {
        this.sitters.add(v)
        g.speech.say(v, pick(this.r, SIT), 3)
        this.report({ kind: 'sat', who: v.id })
      }
    }
  }

  /** The turtle came out of its shell. */
  onUnhide(): void {
    const p = this.g.player
    for (const v of this.sitters)
      if (!v.inside && Math.hypot(v.x - p.x, v.y - p.y) < 14) {
        v.flee(this.g, p, pick(this.r, UNSEAT))
        this.report({ kind: 'unseated', who: v.id })
      }
    this.sitters.clear()
  }

  /** The turtle climbed out of the water. */
  onEmerge(): void {
    const p = this.g.player
    let scared = false
    for (const v of this.g.villagers) {
      // (Roshi knows his own turtle.)
      if (v.inside || v.busy || v.id === 'roshi' || Math.hypot(v.x - p.x, v.y - p.y) > 56) continue
      v.flee(this.g, p, pick(this.r, KAPPA))
      if (!scared) this.report({ kind: 'kappa', who: v.id })
      scared = true
    }
  }

  /** F: grab, drop, eat or bite. */
  snap(): void {
    const g = this.g
    const p = g.player
    const f = p.front()
    if (this.carried) {
      this.drop(this.carried, f.x, f.y + 3)
      return
    }
    let best: Item | null = null
    let bd = 16
    for (const it of this.items) {
      if (!this.visible(it)) continue
      const d = Math.min(Math.hypot(it.x - f.x, it.y - f.y), Math.hypot(it.x - p.x, it.y - p.y) + 2)
      if (d < bd) [best, bd] = [it, d]
    }
    if (best) {
      const v = this.owner(best)
      const sees = v && !v.inside && Math.hypot(v.x - p.x, v.y - p.y) < 140
      if (best.def.edible) {
        best.gone = true
        best.respawn = 40
        g.speech.floater(p.x, p.y - 16, '*munch munch*', '#f0a0b8')
        this.report({ kind: 'ate', item: best.kind })
        if (sees && !v.busy) v.yelp(g, best.def.shout)
        return
      }
      this.carried = best
      g.speech.floater(p.x, p.y - 16, '*snap*', '#f2d04a')
      this.report({ kind: 'grab', item: best.kind })
      if (sees && !v.busy) this.startChase(v, best)
      return
    }
    for (const v of g.villagers) {
      if (v.inside || v.busy) continue
      if (Math.hypot(v.x - f.x, v.y - 4 - f.y) < 16) {
        v.yelp(g, pick(this.r, BITE))
        const samurai = !!v.spec.look.extras?.includes('swords') || /samurai|retainer/i.test(v.spec.title)
        this.report({ kind: 'bite', who: v.id, samurai })
        return
      }
    }
    g.speech.floater(p.x, p.y - 16, '*snap!*', '#d8d0c0')
  }

  private drop(it: Item, x: number, y: number): void {
    const g = this.g
    this.carried = null
    it.x = x
    it.y = y
    const near = (px: number, py: number, r: number) => Math.hypot(px - x, py - y) < r
    const roshi = g.villagers.find((v) => v.id === 'roshi')
    if (it.kind === 'sake' && roshi && !roshi.inside && near(roshi.x, roshi.y, 30)) {
      it.gone = true
      it.respawn = 1e9
      g.speech.say(roshi, 'HOHOHO! THE GOOD STUFF! Good turtle! Best turtle! …Now go and get me another one.', 5)
      this.report({ kind: 'deliverSake' })
      return
    }
    for (const w of g.world.props) {
      if (w.kind !== 'well' || !near(w.x * TILE + 8, w.y * TILE + 8, 20)) continue
      it.gone = true
      it.respawn = 60
      g.fx.splash(w.x * TILE + 8, w.y * TILE + 6)
      g.speech.floater(w.x * TILE + 8, w.y * TILE - 6, '…plop.', '#cfe8f0')
      this.report({ kind: 'well', item: it.kind })
      return
    }
    if (it.kind === 'fish') {
      const cat = g.animals.find((a) => a.kind === 'cat' && a.visible && near(a.x, a.y, 22))
      if (cat) {
        it.gone = true
        it.respawn = 60
        g.speech.floater(cat.x, cat.y - 14, `*nom nom nom* (${cat.name} approves)`, '#f2d04a')
        this.report({ kind: 'catFish' })
        return
      }
    }
    if (it.kind === 'cucumber') {
      const board = g.world.props.find((b) => b.kind === 'board' && b.variant === 'contracts' && near(b.x * TILE + 16, b.y * TILE + 8, 28))
      if (board) {
        it.pinned = true
        g.speech.floater(x, y - 16, 'CONTRACT FULFILLED (sort of)', '#86b860')
        this.report({ kind: 'cucumberContract' })
        return
      }
    }
    g.speech.floater(x, y - 12, '*plonk*', '#d8d0c0')
  }

  /** The owner caught you: they take it back home. */
  snatch(it: Item): void {
    if (this.carried === it) this.carried = null
    it.reset()
  }

  ringFireBell(at: { x: number; y: number }): void {
    const g = this.g
    if (g.musicOn) playFireBell()
    g.speech.floater(at.x, at.y - 60, 'CLANG! CLANG! CLANG!', '#f06a2a')
    for (const v of g.villagers) {
      if (v.inside || v.busy || Math.hypot(v.x - at.x, v.y - at.y) > 40 * TILE || this.r() > 0.75) continue
      v.flee(g, at, v.id === 'seiroku' ? 'WHO RANG MY BELL?! There is NO FIRE!' : pick(this.r, FIRE))
    }
    this.report({ kind: 'fireBell' })
  }

  ringTempleBell(): void {
    if (this.g.musicOn) playBell()
    this.report({ kind: 'templeBell' })
  }

  /** Things lying on the ground, for the y-sorted draw. */
  drawables(ctx: Ctx, camX: number, camY: number): { sortY: number; draw: () => void }[] {
    const out: { sortY: number; draw: () => void }[] = []
    for (const it of this.items) {
      if (it === this.carried || !this.visible(it) || !this.g.onScreen(it.x, it.y)) continue
      out.push({
        sortY: it.y,
        draw: () => {
          const s = itemSprite(it.kind)
          ctx.globalAlpha = 0.25
          ellipse(ctx, it.x - camX, it.y - camY, s.img.width / 2.5, 1.5, '#10140c')
          ctx.globalAlpha = 1
          ctx.drawImage(s.img, Math.round(it.x - s.ax - camX), Math.round(it.y - s.ay - camY))
        },
      })
    }
    return out
  }

  /** The thing in the turtle's jaws (not while it's tucked in its shell). */
  drawCarried(ctx: Ctx, camX: number, camY: number): void {
    const p = this.g.player
    if (!this.carried || p.hidden) return
    const s = itemSprite(this.carried.kind)
    const off = { left: [-11, -3], right: [11, -3], up: [0, -12], down: [0, 1] }[p.dir]
    ctx.drawImage(s.img, Math.round(p.x + off[0] - s.ax - camX), Math.round(p.y + off[1] - s.ay - camY))
  }
}
