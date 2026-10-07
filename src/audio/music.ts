// Generative background score: koto phrases in the bright yō scale over a plucked bass and a soft
// open-fifth pad. Melodies are built from short motifs that repeat, vary and come home to the root,
// so it sounds like a tune rather than a wander. Nights are slower and sparser, never gloomy.

import { getGraph, type Graph } from './engine'
import { drone, koto, scaleHz, type Drone } from './instruments'

export type Mood = 'day' | 'night'

const MOODS: Record<Mood, { bpm: number; density: number; drone: number }> = {
  day: { bpm: 84, density: 1, drone: 0.16 },
  night: { bpm: 64, density: 0.6, drone: 0.12 },
}
/** Rhythms for one bar of eighths (1 = a note). */
const RHYTHMS = [
  [1, 0, 1, 1, 1, 0, 1, 0],
  [1, 1, 0, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 1, 1, 1, 0],
  [1, 0, 1, 0, 1, 1, 0, 0],
  [1, 1, 1, 0, 1, 0, 1, 0],
]
const LOOKAHEAD_S = 0.15
const TICK_MS = 30
/** Melody degrees: 5 = D4, 10 = D5. */
const HOME = 5

let timer: ReturnType<typeof setInterval> | null = null
let pad: Drone | null = null
let mood: Mood = 'day'
let nextTime = 0
let step = 0
/** The current four-bar phrase: a degree or null per eighth. */
let phrase: (number | null)[] = []

function motif(start: number): (number | null)[] {
  const rhythm = RHYTHMS[Math.floor(Math.random() * RHYTHMS.length)]
  let d = start
  return rhythm.map((on) => {
    if (!on) return null
    d = Math.max(3, Math.min(11, d + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]))
    return d
  })
}

/** A A' B A'', the last bar landing on the root. */
function newPhrase(): (number | null)[] {
  const a = motif(HOME + Math.floor(Math.random() * 3))
  const a2 = [...a]
  const last = a2.map((n, i) => (n === null ? -1 : i)).filter((i) => i >= 0).pop() ?? 0
  a2[last] = (a2[last] ?? HOME) + (Math.random() < 0.5 ? 1 : -1)
  const b = motif(HOME + 2 + Math.floor(Math.random() * 2))
  const end = [...a.slice(0, 4), HOME + 2, null, HOME, null]
  return [...a, ...a2, ...b, ...end]
}

function scheduleStep(g: Graph, when: number): void {
  if (step === 0) phrase = newPhrase()
  const m = MOODS[mood]
  const note = phrase[step]
  if (note !== null && note !== undefined && Math.random() < m.density) {
    koto(g, g.music, scaleHz(note), when, 0.26 + Math.random() * 0.08)
    // Now and then a soft note two steps below: a warm interval, not a cluster.
    if (Math.random() < 0.15) koto(g, g.music, scaleHz(note - 2), when + 0.02, 0.12)
  }
  // Bass: root on the bar, fifth halfway, the octave sometimes on the "and" of three.
  const beat = step % 8
  if (beat === 0) koto(g, g.music, scaleHz(0), when, 0.22)
  else if (beat === 4 && (mood === 'day' || Math.random() < 0.5)) koto(g, g.music, scaleHz(3), when, 0.16)
  else if (beat === 6 && mood === 'day' && Math.random() < 0.4) koto(g, g.music, scaleHz(HOME), when, 0.12)
  step = (step + 1) % 32
}

function tick(): void {
  const g = getGraph()
  if (!g || g.ctx.state !== 'running') return
  const eighth = 30 / MOODS[mood].bpm
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
  pad.setLevel(MOODS[mood].drone, g.ctx.currentTime)
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

/** Day tunes or night tunes; changes take effect at the next note. */
export function setMood(next: Mood): void {
  if (next === mood) return
  mood = next
  const g = getGraph()
  if (g && pad) pad.setLevel(MOODS[mood].drone, g.ctx.currentTime)
}
