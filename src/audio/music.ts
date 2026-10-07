// Generative background score: a drone and a wandering koto melody in the in-scale. Never loops
// audibly because every phrase is chosen live.

import { getGraph, type Graph } from './engine'
import { drone, koto, scaleHz, type Drone } from './instruments'

const BPM = 66
const NOTE_CHANCE = 0.22 // per eighth note
const DRONE_LEVEL = 0.35
const LOOKAHEAD_S = 0.15
const TICK_MS = 30

let timer: ReturnType<typeof setInterval> | null = null
let pad: Drone | null = null
let nextTime = 0
let step = 0
let degree = 5 // melody position in scale degrees (5 = D4)

function scheduleStep(g: Graph, when: number): void {
  // Melody: random walk, weighted toward small steps, resting on phrase ends.
  const phraseEnd = step % 8 === 7
  if (!phraseEnd && Math.random() < NOTE_CHANCE) {
    const move = [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]
    degree = Math.max(2, Math.min(11, degree + move))
    koto(g, g.music, scaleHz(degree), when, 0.28 + Math.random() * 0.1)
    // Occasional octave-below grace note, a common koto gesture.
    if (Math.random() < 0.12) koto(g, g.music, scaleHz(degree - 5), when + 0.04, 0.18)
  }

  // Bass anchor on the downbeat of each bar.
  if (step % 8 === 0 && Math.random() < 0.7) koto(g, g.music, scaleHz(0), when, 0.25)

  step = (step + 1) % 16
}

function tick(): void {
  const g = getGraph()
  if (!g || g.ctx.state !== 'running') return
  const eighth = 30 / BPM
  if (nextTime < g.ctx.currentTime) nextTime = g.ctx.currentTime + 0.05
  while (nextTime < g.ctx.currentTime + LOOKAHEAD_S) {
    scheduleStep(g, nextTime)
    nextTime += eighth
  }
}

export function startMusic(): void {
  const g = getGraph()
  if (!g || timer) return
  pad = drone(g, g.music)
  pad.setLevel(DRONE_LEVEL, g.ctx.currentTime)
  step = 0
  nextTime = 0
  timer = setInterval(tick, TICK_MS)
}

export function stopMusic(): void {
  const g = getGraph()
  if (timer) clearInterval(timer)
  timer = null
  if (g && pad) pad.stop(g.ctx.currentTime)
  pad = null
}
