// The to-do list: a sheet of washi paper pinned to the right of the screen, jobs struck through
// with a brush stroke as they're done. Tab shows it; it also pops up for a moment when a job is done.

import type { Screen } from '../engine/screen'
import type { Todo } from '../mischief/todo'
import { FONT_BODY, FONT_TITLE, PALETTE, roundRect, wrap } from './draw'

export function drawTodo(screen: Screen, todo: Todo, now: number, alpha: number): void {
  if (alpha <= 0) return
  const ctx = screen.dctx
  const u = (n: number) => screen.u(n)
  const lines = todo.lines(now)
  const W = Math.min(u(300), screen.W * 0.42)
  ctx.font = `${u(14)}px ${FONT_BODY}`
  const wrapped = lines.map((l) => wrap(ctx, l.text, W - u(58)))
  const rowH = u(19)
  const H = u(62) + wrapped.reduce((a, w) => a + w.length * rowH + u(5), 0) + u(14)
  const x = screen.W - W - u(14)
  const y = Math.max(u(88), (screen.H - H) / 2)
  ctx.globalAlpha = alpha
  // Paper, slightly tilted shadow, a pin.
  ctx.fillStyle = 'rgba(10, 6, 8, 0.35)'
  roundRect(ctx, x + u(5), y + u(6), W, H, u(3))
  ctx.fill()
  ctx.fillStyle = '#efe5cc'
  roundRect(ctx, x, y, W, H, u(3))
  ctx.fill()
  ctx.strokeStyle = '#c8b892'
  ctx.lineWidth = u(1)
  for (let ly = y + u(56); ly < y + H - u(8); ly += rowH) {
    ctx.beginPath()
    ctx.moveTo(x + u(14), ly + u(16))
    ctx.lineTo(x + W - u(14), ly + u(16))
    ctx.stroke()
  }
  ctx.fillStyle = PALETTE.vermilion
  ctx.beginPath()
  ctx.arc(x + W / 2, y + u(8), u(5), 0, Math.PI * 2)
  ctx.fill()
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  ctx.font = `${u(14)}px ${FONT_TITLE}`
  ctx.fillStyle = PALETTE.ink
  ctx.fillText('TO DO IN KUMOI', x + u(16), y + u(20))
  ctx.font = `${u(12)}px ${FONT_BODY}`
  ctx.fillStyle = '#7a6a52'
  ctx.textAlign = 'right'
  ctx.fillText(`${todo.count}/${todo.total}`, x + W - u(16), y + u(22))
  ctx.textAlign = 'left'
  let yy = y + u(54)
  ctx.font = `${u(14)}px ${FONT_BODY}`
  lines.forEach((l, i) => {
    const rows = wrapped[i]
    // Box, ticked when done.
    ctx.strokeStyle = '#5a4a3a'
    ctx.lineWidth = u(1.5)
    ctx.strokeRect(x + u(16), yy + u(3), u(12), u(12))
    ctx.fillStyle = l.done ? '#6a5a4a' : PALETTE.ink
    rows.forEach((r, k) => ctx.fillText(r, x + u(38), yy + k * rowH))
    if (l.done) {
      // The brush stroke draws itself across over half a second.
      const k = l.age < 0 ? 1 : Math.min(1, l.age / 0.5)
      ctx.strokeStyle = PALETTE.vermilion
      ctx.lineWidth = u(2.5)
      ctx.lineCap = 'round'
      rows.forEach((r, j) => {
        const w = ctx.measureText(r).width
        const ly = yy + j * rowH + u(8)
        ctx.beginPath()
        ctx.moveTo(x + u(36), ly + u(1))
        ctx.lineTo(x + u(36) + (w + u(4)) * k, ly - u(1))
        ctx.stroke()
      })
      ctx.beginPath()
      ctx.moveTo(x + u(18), yy + u(9))
      ctx.lineTo(x + u(22), yy + u(14))
      ctx.lineTo(x + u(30), yy + u(1))
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
    yy += rows.length * rowH + u(5)
  })
  if (todo.count === todo.total) {
    ctx.font = `${u(13)}px ${FONT_TITLE}`
    ctx.fillStyle = PALETTE.vermilion
    ctx.fillText('ALL DONE. HOHOHO!', x + u(16), yy + u(2))
  }
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha = 1
}
