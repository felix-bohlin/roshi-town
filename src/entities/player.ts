// Kame the turtle: walks (slowly), hurries (Shift; still slowly), swims (faster than walking, as
// turtles do), and hides in its shell, which turns it into a rock as far as the village is concerned.

import type { Sprite } from '../art/sprite'
import { turtleSprite } from '../art/turtle'
import { input } from '../engine/input'
import { tileOf } from '../world/grid'
import { idx, isWet, T, TILE, type Dir } from '../world/layout'
import type { Game } from '../game'

const WALK = 46
const HURRY = 92
const SWIM = 64

const HUFFS = ['*huff*', '*puff*', '*huff… puff*', '*wheeze*', '(why are there so many steps)', '*huff*']

export class Player {
  x: number
  y: number
  dir: Dir = 'down'
  hidden = false
  hiddenFor = 0
  swimming = false
  moving = false
  private walkDist = 0
  private popOut = 0
  private lastEdgeNag = -99
  private rippleT = 0
  private huffT = 0
  /** Set once the turtle has reached the temple on this climb; cleared back down in town. */
  private summited = false

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  update(g: Game, dt: number, frozen: boolean): void {
    this.moving = false
    if (this.hidden) this.hiddenFor += dt
    if (frozen) return

    if (input.pressed('Space') && !this.swimming) {
      this.hidden = !this.hidden
      this.hiddenFor = 0
      if (this.hidden) g.speech.floater(this.x, this.y - 12, '*fwump*', '#c4ccfa')
    }
    const a = input.axis()
    const wants = Math.hypot(a.x, a.y) > 0.1
    if (this.hidden) {
      // Pop back out after holding a direction for a moment.
      this.popOut = wants ? this.popOut + dt : 0
      if (this.popOut > 0.25) {
        this.hidden = false
        this.popOut = 0
      } else return
    }
    if (!wants) return

    const here = tileOf(this.x, this.y)
    const stairs = g.world.tiles[idx(here.x, here.y)] === T.Stairs
    // Stairs are hard work on four short legs.
    const speed = (this.swimming ? SWIM : input.down('ShiftLeft', 'ShiftRight') ? HURRY : WALK) * (stairs ? 0.5 : 1)
    const dx = a.x * speed * dt
    const dy = a.y * speed * dt
    const before = { x: this.x, y: this.y }
    if (!this.blocked(g, this.x + dx, this.y)) this.x += dx
    if (!this.blocked(g, this.x, this.y + dy)) this.y += dy
    const moved = Math.hypot(this.x - before.x, this.y - before.y)
    this.walkDist += moved
    this.moving = moved > 0.01
    if (Math.abs(a.x) > Math.abs(a.y)) this.dir = a.x < 0 ? 'left' : 'right'
    else this.dir = a.y < 0 ? 'up' : 'down'

    const t = tileOf(this.x, this.y)
    const wasSwimming = this.swimming
    this.swimming = isWet(g.world.tiles[idx(t.x, t.y)])
    if (this.swimming && !wasSwimming) {
      g.fx.splash(this.x, this.y)
      g.speech.floater(this.x, this.y - 10, '*plop*', '#cfe8f0')
    }
    if (this.swimming && this.moving) {
      this.rippleT -= dt
      if (this.rippleT <= 0) {
        g.fx.ripple(this.x, this.y - 2)
        this.rippleT = 0.35
      }
    }
    if (stairs && this.moving && a.y < 0) {
      this.huffT -= dt
      if (this.huffT <= 0) {
        this.huffT = 2.5 + Math.random() * 2
        g.speech.floater(this.x, this.y - 18, HUFFS[Math.floor(Math.random() * HUFFS.length)], '#d8d0c0')
      }
    }
    // The summit, and the long way back down.
    if (!this.summited && g.world.tiles[idx(t.x, t.y)] === T.Gravel && t.y < 19 && t.x > 114 && t.x < 185) {
      this.summited = true
      g.speech.say(this, 'Made it. One thousand and eighty-two steps. My knees, all four of them, would like a word.', 4.5)
    } else if (this.summited && t.y > 80) this.summited = false
    // The map edge: Roshi's voice carries a long way.
    if ((t.x <= 1 || t.x >= g.world.w - 2 || t.y >= g.world.h - 2) && g.time - this.lastEdgeNag > 8) {
      this.lastEdgeNag = g.time
      g.speech.say(this, t.y >= g.world.h - 2 ? '(Roshi, from the island) Wrong way! The sake is in TOWN! Hohoho!' : '(Roshi, faintly, from very far away) No sake, no coming home! Hohoho!', 4)
    }
  }

  private blocked(g: Game, x: number, y: number): boolean {
    // Small feet box.
    const pts = [
      [x - 5, y - 3],
      [x + 5, y - 3],
      [x - 5, y + 1],
      [x + 5, y + 1],
    ]
    for (const [px, py] of pts) {
      const tx = Math.floor(px / TILE)
      const ty = Math.floor(py / TILE)
      if (tx < 0 || ty < 0 || tx >= g.world.w || ty >= g.world.h) return true
      if (g.grid.solidPlayer[idx(tx, ty)]) return true
    }
    return false
  }

  /** The point just in front of the turtle (for talking / inspecting). */
  front(): { x: number; y: number } {
    const d = 12
    switch (this.dir) {
      case 'left':
        return { x: this.x - d, y: this.y - 2 }
      case 'right':
        return { x: this.x + d, y: this.y - 2 }
      case 'up':
        return { x: this.x, y: this.y - d }
      default:
        return { x: this.x, y: this.y + d - 4 }
    }
  }

  sprite(): Sprite {
    const frame = this.moving ? Math.floor(this.walkDist / 4) % 4 : 0
    return turtleSprite(this.dir, this.hidden ? 'hide' : this.swimming ? 'swim' : 'walk', frame)
  }
}
