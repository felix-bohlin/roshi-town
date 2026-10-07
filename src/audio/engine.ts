// Shared Web Audio graph: one context, two buses (music, sfx) into a master with a reverb send.
// Everything is synthesized — there are no audio assets to load.

export interface Graph {
  ctx: AudioContext
  music: GainNode
  sfx: GainNode
  reverb: GainNode // send: connect a voice here as well as to its bus for room sound
}

let graph: Graph | null = null

/** Synthetic hall impulse: decaying stereo noise. */
function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

/** Lazily builds the graph. Returns null where Web Audio is unavailable (SSR, old browsers). */
export function getGraph(): Graph | null {
  if (graph) return graph
  const Ctor = typeof window !== 'undefined' ? window.AudioContext : undefined
  if (!Ctor) return null

  const ctx = new Ctor()
  const master = ctx.createGain()
  master.gain.value = 0.8
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -6
  limiter.ratio.value = 12
  master.connect(limiter).connect(ctx.destination)

  const music = ctx.createGain()
  music.gain.value = 0.5
  const sfx = ctx.createGain()
  sfx.gain.value = 0.8
  music.connect(master)
  sfx.connect(master)

  const reverb = ctx.createGain()
  reverb.gain.value = 0.35
  const convolver = ctx.createConvolver()
  convolver.buffer = makeImpulse(ctx, 2.8, 2.5)
  reverb.connect(convolver).connect(master)

  graph = { ctx, music, sfx, reverb }
  return graph
}

/** Browsers keep audio suspended until a user gesture: call this from the first key or click. */
export async function unlockAudio(): Promise<void> {
  const g = getGraph()
  if (g && g.ctx.state !== 'running') await g.ctx.resume()
}
