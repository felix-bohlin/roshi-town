// A* on the tile grid, 4-connected. `cost(i)` returns the cost of stepping onto tile i
// (Infinity = blocked). Villagers prefer roads because grass and fields cost more.
//
// The search buffers are shared between calls and reset lazily with a generation stamp, so a
// path across a big map doesn't allocate a megabyte of arrays every time somebody goes to lunch.

let cap = 0
let gScore = new Float64Array(0)
let from = new Int32Array(0)
let seen = new Uint32Array(0)
let closed = new Uint32Array(0)
let gen = 0
const heap: number[] = []
const fOf: number[] = []

/** Slightly greedy: paths stay near-shortest and the search expands far fewer tiles. */
const HEURISTIC_WEIGHT = 1.15

export function astar(w: number, h: number, cost: (i: number) => number, start: number, goal: number, maxNodes = 6000): number[] | null {
  if (start === goal) return [goal]
  const n = w * h
  if (n > cap) {
    cap = n
    gScore = new Float64Array(n)
    from = new Int32Array(n)
    seen = new Uint32Array(n)
    closed = new Uint32Array(n)
    gen = 0
  }
  gen++
  const gx = goal % w
  const gy = (goal / w) | 0
  const heur = (i: number) => HEURISTIC_WEIGHT * (Math.abs((i % w) - gx) + Math.abs(((i / w) | 0) - gy))
  const gOf = (i: number) => (seen[i] === gen ? gScore[i] : Infinity)

  heap.length = 0
  fOf.length = 0
  const push = (i: number, f: number) => {
    heap.push(i)
    fOf.push(f)
    let k = heap.length - 1
    while (k > 0) {
      const p = (k - 1) >> 1
      if (fOf[p] <= fOf[k]) break
      ;[heap[p], heap[k]] = [heap[k], heap[p]]
      ;[fOf[p], fOf[k]] = [fOf[k], fOf[p]]
      k = p
    }
  }
  const pop = (): number => {
    const top = heap[0]
    const lastI = heap.pop()!
    const lastF = fOf.pop()!
    if (heap.length) {
      heap[0] = lastI
      fOf[0] = lastF
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        const r = l + 1
        let m = k
        if (l < heap.length && fOf[l] < fOf[m]) m = l
        if (r < heap.length && fOf[r] < fOf[m]) m = r
        if (m === k) break
        ;[heap[m], heap[k]] = [heap[k], heap[m]]
        ;[fOf[m], fOf[k]] = [fOf[k], fOf[m]]
        k = m
      }
    }
    return top
  }

  seen[start] = gen
  gScore[start] = 0
  from[start] = -1
  push(start, heur(start))
  let expanded = 0
  let found = false
  while (heap.length) {
    const cur = pop()
    if (closed[cur] === gen) continue
    if (cur === goal) {
      found = true
      break
    }
    closed[cur] = gen
    if (++expanded > maxNodes) return null
    const cx = cur % w
    const cy = (cur / w) | 0
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0)
      const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0)
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      const ni = ny * w + nx
      if (closed[ni] === gen) continue
      const c = ni === goal ? Math.min(cost(ni), 1) : cost(ni)
      if (!isFinite(c)) continue
      const ng = gScore[cur] + c
      if (ng < gOf(ni)) {
        seen[ni] = gen
        gScore[ni] = ng
        from[ni] = cur
        push(ni, ng + heur(ni))
      }
    }
  }
  if (!found) return null
  const out: number[] = []
  for (let i = goal; i !== start; i = from[i]) out.push(i)
  out.reverse()
  return out
}
