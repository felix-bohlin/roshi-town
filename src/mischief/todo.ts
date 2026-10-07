// The to-do list: a page of small acts of mischief, in the spirit of a certain goose. Things the
// turtle does are reported as events; a job is crossed off when an event matches it. Progress is
// kept in this browser (localStorage) so a reload doesn't undo a good day's work.

import type { ItemKind } from '../art/items'

export interface MischiefEvent {
  kind:
    | 'grab'
    | 'ate'
    | 'well'
    | 'catFish'
    | 'trip'
    | 'sat'
    | 'unseated'
    | 'kappa'
    | 'bite'
    | 'fireBell'
    | 'templeBell'
    | 'cucumberContract'
    | 'chased'
    | 'lost'
    | 'deliverSake'
  item?: ItemKind
  /** Villager id involved. */
  who?: string
  samurai?: boolean
  /** For 'chased': how many different people have chased the turtle so far. */
  count?: number
}

interface Job {
  id: string
  text: string
  test: (e: MischiefEvent) => boolean
}

const JOBS: Job[] = [
  { id: 'sandal', text: 'Steal Sanpei’s left sandal', test: (e) => e.kind === 'grab' && e.item === 'sandal' },
  { id: 'well', text: 'Drop the sandal down a well', test: (e) => e.kind === 'well' && e.item === 'sandal' },
  { id: 'dango', text: 'Eat Oume’s dango', test: (e) => e.kind === 'ate' && e.item === 'dango' },
  { id: 'cats', text: 'Feed a stolen fish to the harbour cats', test: (e) => e.kind === 'catFish' },
  { id: 'trip', text: 'Make someone trip over you', test: (e) => e.kind === 'trip' },
  { id: 'sat', text: 'Let someone sit on you…', test: (e) => e.kind === 'sat' },
  { id: 'unseat', text: '…then stand up', test: (e) => e.kind === 'unseated' },
  { id: 'kappa', text: 'Convince someone you are a kappa', test: (e) => e.kind === 'kappa' },
  { id: 'bite', text: 'Bite a samurai on the toe', test: (e) => e.kind === 'bite' && !!e.samurai },
  { id: 'fire', text: 'Ring the fire bell for no reason', test: (e) => e.kind === 'fireBell' },
  { id: 'contract', text: 'Bring the kappa contract its cucumber', test: (e) => e.kind === 'cucumberContract' },
  { id: 'chase3', text: 'Get chased by three different people', test: (e) => e.kind === 'chased' && (e.count ?? 0) >= 3 },
  { id: 'sake', text: 'Steal the GOOD sake from the brewery', test: (e) => e.kind === 'grab' && e.item === 'sake' },
  { id: 'roshi', text: 'Bring it home to Master Roshi', test: (e) => e.kind === 'deliverSake' },
]

const KEY = 'roshi-town.todo.v1'

export interface TodoLine {
  id: string
  text: string
  done: boolean
  /** Seconds since it was crossed off (for the ink stroke), or -1. */
  age: number
}

export class Todo {
  private done = new Map<string, number>()
  /** Time the page last changed (opens the notepad for a moment). */
  changedAt = -99

  constructor() {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) for (const id of JSON.parse(raw) as string[]) this.done.set(id, -999)
    } catch {
      // No storage (private window, blocked): the list just starts fresh.
    }
  }

  /** Report something that happened; returns the jobs it crossed off. */
  record(e: MischiefEvent, now: number): string[] {
    const crossed: string[] = []
    for (const j of JOBS) {
      if (this.done.has(j.id) || !j.test(e)) continue
      this.done.set(j.id, now)
      crossed.push(j.text)
    }
    if (crossed.length) {
      this.changedAt = now
      try {
        localStorage.setItem(KEY, JSON.stringify([...this.done.keys()]))
      } catch {
        // Not saved; fine.
      }
    }
    return crossed
  }

  lines(now: number): TodoLine[] {
    return JOBS.map((j) => {
      const at = this.done.get(j.id)
      return { id: j.id, text: j.text, done: at !== undefined, age: at === undefined ? -1 : now - at }
    })
  }

  get count(): number {
    return this.done.size
  }

  get total(): number {
    return JOBS.length
  }
}
