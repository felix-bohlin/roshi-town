// Things a turtle can carry off in its jaws (or eat): small sprites, drawn once and cached.

import { canvas, dot, ellipse, outline, px } from '../engine/pixel'
import type { Sprite } from './sprite'

export type ItemKind = 'sandal' | 'fish' | 'cucumber' | 'sake' | 'dango' | 'fan'

const cache = new Map<ItemKind, Sprite>()

export function itemSprite(kind: ItemKind): Sprite {
  const hit = cache.get(kind)
  if (hit) return hit
  const s = draw(kind)
  cache.set(kind, s)
  return s
}

function draw(kind: ItemKind): Sprite {
  switch (kind) {
    case 'sandal': {
      // A straw zōri, red thong, worn at the heel. Left foot, naturally.
      const [c, ctx] = canvas(12, 8)
      ellipse(ctx, 6, 4, 5, 2.6, '#c9a860')
      for (let x = 2; x < 11; x += 2) dot(ctx, x, 4, '#a68848')
      px(ctx, 3, 3, 3, 1, '#d23c2a')
      px(ctx, 5, 2, 1, 3, '#d23c2a')
      dot(ctx, 9, 5, '#8a6a38')
      outline(c, '#1a1220')
      return { img: c, ax: 6, ay: 6 }
    }
    case 'fish': {
      const [c, ctx] = canvas(14, 7)
      ellipse(ctx, 6, 3.5, 5, 2.4, '#a9b4bc')
      px(ctx, 2, 3, 7, 1, '#d8e0e4')
      px(ctx, 11, 1, 2, 5, '#7a8a94')
      dot(ctx, 3, 3, '#1a1220')
      px(ctx, 5, 5, 4, 1, '#6a7680')
      outline(c, '#1a1220')
      return { img: c, ax: 7, ay: 5 }
    }
    case 'cucumber': {
      const [c, ctx] = canvas(12, 6)
      ellipse(ctx, 6, 3, 5, 2, '#4a8a3a')
      px(ctx, 2, 2, 8, 1, '#6aa848')
      for (let x = 2; x < 10; x += 3) dot(ctx, x, 4, '#2f5a2e')
      dot(ctx, 11, 3, '#d8c060')
      outline(c, '#1a1220')
      return { img: c, ax: 6, ay: 5 }
    }
    case 'sake': {
      // A tokkuri of the good stuff: white glaze, blue band, a red paper seal.
      const [c, ctx] = canvas(9, 14)
      ellipse(ctx, 4.5, 9, 3.6, 4, '#ece6d6')
      px(ctx, 3, 2, 3, 4, '#ece6d6')
      px(ctx, 2, 1, 5, 2, '#d8d0c0')
      px(ctx, 1, 8, 7, 2, '#2f3f73')
      px(ctx, 3, 9, 3, 3, '#d23c2a')
      dot(ctx, 4, 10, '#f4e0c8')
      px(ctx, 3, 0, 3, 1, '#8a6a38')
      outline(c, '#1a1220')
      return { img: c, ax: 4, ay: 13 }
    }
    case 'dango': {
      // Three dumplings on a skewer, on a little plate.
      const [c, ctx] = canvas(13, 8)
      ellipse(ctx, 6.5, 6, 6, 1.6, '#e8e2d2')
      px(ctx, 1, 4, 11, 1, '#a68848')
      ellipse(ctx, 3, 3.5, 1.8, 1.8, '#f0a0b8')
      ellipse(ctx, 6.5, 3.5, 1.8, 1.8, '#f4f1ea')
      ellipse(ctx, 10, 3.5, 1.8, 1.8, '#86b860')
      outline(c, '#1a1220')
      return { img: c, ax: 6, ay: 7 }
    }
    case 'fan': {
      const [c, ctx] = canvas(12, 8)
      for (let k = 0; k < 6; k++) px(ctx, 1 + k * 2, 1 + Math.abs(2 - k) / 2, 2, 5, k % 2 ? '#e0b13c' : '#d23c2a')
      px(ctx, 5, 6, 2, 2, '#3a2a1c')
      outline(c, '#1a1220')
      return { img: c, ax: 6, ay: 7 }
    }
  }
}
