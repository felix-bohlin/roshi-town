// Bells and chimes: the temple bell (a long, low gong), the fire bell (three sharp clangs), and the
// little koto flourish when a job is crossed off the to-do list.

import { getGraph } from './engine'
import { gong, koto, scaleHz } from './instruments'

export function playBell(): void {
  const g = getGraph()
  if (!g || g.ctx.state !== 'running') return
  gong(g, g.sfx, g.ctx.currentTime + 0.05, 0.6, 72, 7)
}

export function playFireBell(): void {
  const g = getGraph()
  if (!g || g.ctx.state !== 'running') return
  for (let i = 0; i < 3; i++) gong(g, g.sfx, g.ctx.currentTime + 0.05 + i * 0.35, 0.45, 420, 1.2)
}

/** Up the scale: a job done. */
export function playChime(): void {
  const g = getGraph()
  if (!g || g.ctx.state !== 'running') return
  const t = g.ctx.currentTime + 0.02
  ;[5, 7, 8, 10].forEach((d, i) => koto(g, g.sfx, scaleHz(d), t + i * 0.09, 0.35))
}
