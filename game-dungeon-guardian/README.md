# 🛡️ Dungeon Guardian — learn Agentic State Machines by playing

A tiny, **zero-dependency** stealth game whose entire point is to let you *watch an AI
agent think*. The guard is an **agentic state machine**: every tick it **senses** the
world, **thinks** (picks a transition), and **acts**. The panel on the right shows its
current state, its memory, and a live transition log — so the abstract idea from this
repo becomes something you can *see and poke at*.

> **One sentence to remember:** in this project an **Agent = an Actor + a brain + a State Machine**.
> The game makes all three visible.

---

## ▶️ How to play (10 seconds to start)

**Just open the file.** Double-click `index.html`, or drag it into any browser. No build,
no `npm install`, no API key. Everything runs locally in the page.

- **Move:** Arrow keys or `WASD`
- **Sneak (silent):** hold `Shift` while moving — you make no noise
- **Shove the guard:** `Space` when you're right next to it (hurts it → triggers the human-in-the-loop)
- **Goal:** grab the 💎, reach the 🚪 exit. Don't get caught (3 ❤).
- **Buttons:** `Pause`, `Step tick` (advance the agent one thought at a time — great for learning), `Reset`, and a speed slider.

👉 **Best way to learn:** hit **Pause**, then tap **Step tick** repeatedly and read the
transition log after every step. You're literally single-stepping the agent's brain.

---

## The big idea: an agent is a state machine with a brain

A plain chatbot is "input → LLM → output". An **agent** is different: it runs a *loop*,
keeps *memory*, chooses *actions*, uses *tools*, and sometimes *pauses for a human*. That
loop needs structure or it becomes an unpredictable mess. A **finite state machine (FSM)**
gives it that structure:

```
          ┌─────────── SENSE ───────────┐
          │  perceive the world (tools) │
          └──────────────┬──────────────┘
                         ▼
          ┌─────────── THINK ───────────┐
          │  which transition fires?    │   ← guards decide, based on perception + memory
          └──────────────┬──────────────┘
                         ▼
          ┌──────────────ACT────────────┐
          │  move / attack / remember    │  ← actions change the world and the context
          └──────────────┬──────────────┘
                         └────── loop ──────┘
```

The guard runs exactly this loop on every `TICK`. Open `index.html` and look at the
`tick()` function — it's three labelled lines.

---

## Tour of the guard's states (and the pattern each one teaches)

The guard has 7 states. Each is a box in the "State chart" panel (hover any box in the
game for a tooltip). Here's what each teaches and where the **same idea lives in this
repo's XState code**:

| State | What it does in the game | Agentic pattern | See in the repo |
|---|---|---|---|
| `patrol` | Walks a fixed route when nothing's happening | The **autonomous loop** — the agent's default behaviour | the top-level `initial` state everywhere |
| `investigate` | Heard a noise → walks to where it came from | **Acting on a weak signal** using memory | — |
| `chase` | Sees you → pursues, refreshing memory each tick | **Tool-use + memory update loop** | `writer.ts` `writing` ⇄ `using_tool` |
| `attack` | Adjacent → deals damage each tick | A **high-intensity state** with its own exit guards | — |
| `search` | Lost sight → sweeps your **last known position** for N ticks | **Memory + a time-boxed sub-goal** | `reflection.ts` `loopCount < maxLoopCount` |
| `returnToPost` | Gave up → walks home, then resumes patrol | **Reset / return to a known-good state** | the `done`→restart idea |
| `callForBackup` | HP low → **pauses and asks YOU** to approve a retreat | **Human-in-the-loop** | `human_in_the_loop.ts` `approval_required` |

### Why states beat a pile of `if` statements
Without an FSM you'd write "if sees player and not fleeing and hp ok and not already
attacking and…" — a tangle that's impossible to reason about. With an FSM the guard can
*only* be in one state, and each state lists *only* the transitions that make sense from
there. That's the README's promise made concrete: **statically analyzable, observable,
predictable, modular.**

---

## The four concepts, mapped game ↔ this repo

### 1. Perception = **tools** (`fromPromise` actors)
Before the guard decides anything, it *senses*: line-of-sight (the orange cone you can
see on the board), hearing, and adjacency. In the game that's `perceive()`. Its result is
handed to the machine on the `TICK` event.

- **Game:** `const p = perceive(ctx); actor.send({ type:'TICK', p })`
- **This repo:** `writer.ts` calls the `get_inventory` tool and feeds the result back in.
  The guard's "I can see 6 tiles in a cone" is the same shape as "here's the inventory I
  looked up" — *information the agent didn't have until it went and got it.*

### 2. Memory = **context** (updated with `assign`)
The guard remembers `lastKnownPlayer` (drawn as the purple "mem" square), a `searchTimer`,
which waypoint it's heading to, and its `hp`. Watch the **Memory / context** panel change
as you play.

- **Game:** actions like `remember` write to `context.lastKnownPlayer`.
- **This repo:** every machine keeps a `context` and updates it with `assign(...)` —
  e.g. `reflection.ts` accumulates `messages` and a `loopCount`. Memory is what makes an
  agent more than a stateless function call.

> ⚠️ Teaching note: the game *mutates* `context` directly because it's easier to read.
> Real XState uses **immutable** updates via `assign()`. Same concept, safer mechanics.

### 3. Routing = **guards** (ordered transitions)
In each state, the guard evaluates a *list* of possible transitions **in order** and takes
the **first one whose guard passes**. This is the single most important pattern in the repo.

```js
// game: guard's patrol state
TICK: [
  { guard: 'hpLow', target: 'callForBackup' },      // checked first
  { guard: 'sees',  target: 'chase', actions:['remember'] },
  { guard: 'hears', target: 'investigate' },
  { actions: ['patrolStep'] },                       // fallback (no guard) = keep patrolling
]
```

```ts
// repo: writer.ts — identical shape
onDone: [
  { guard: ({event}) => event.output.tool_calls != null, target: 'using_tool', ... },
  { target: 'done', ... }   // fallback
]
```

Order matters: "am I about to die?" is checked before "do I see the thief?". Change the
order in the code and the guard's personality changes — try it!

### 4. Human-in-the-loop = a state that **waits for an external event**
When the guard's `hp` drops below 30 (shove it with `Space`), it enters `callForBackup`.
The simulation **freezes** and the operator panel appears. The machine will not move until
*you* send `APPROVE` or `DENY`. That's not a hack — it's the defining feature of an FSM:
a state can simply have no automatic transition and sit there waiting for input.

- **Game:** `callForBackup` has `on: { APPROVE: ..., DENY: ... }` and nothing else.
- **This repo:** `human_in_the_loop.ts` `approval_required` waits for a `USER_MESSAGE`
  before it will run a tool. Same mechanism, real stakes (approving a tool call).

Notice the two choices lead to genuinely different outcomes: **Approve** heals + retreats;
**Deny** sets `backupDenied` so it fights to the end and won't ask again. A good human-in-
the-loop gives the human a *real* decision.

---

## The mini state-machine "engine" (and how it maps to XState)

The game ships a ~60-line `createMachine()` so there's **no magic** — you can read the
whole thing. It deliberately mirrors XState's API so what you learn here transfers 1:1 to
the real machines in `../src/actors/`:

| Game (this file) | XState (the rest of the repo) |
|---|---|
| `createMachine(config, { actions, guards })` | `setup({ actions, guards, actors }).createMachine(config)` |
| `machine.start()` → actor | `createActor(machine).start()` |
| `actor.send({ type:'TICK', p })` | `actor.send({ type:'...' })` |
| `actor.subscribe(fn)` | `actor.subscribe(fn)` |
| `on: { EVENT: [ {guard, target, actions} ] }` | same |
| direct `context` mutation | immutable `assign(...)` |
| `type:'final'` not used (game loops) | `done` states with `output` |

Once the game's engine clicks, open `../src/actors/writer/writer.ts` — you'll recognise
every piece.

---

## 🔬 Experiments to try (this is where the learning happens)

1. **Single-step it.** Pause → Step tick → read the log line (`chase --TICK--> search`).
   Predict the next transition *before* you click. You now understand guards.
2. **Break its perception.** Run into a room and duck behind a wall. Watch it go
   `chase → search → returnToPost → patrol`. You just exploited the line-of-sight *tool*
   and the `searchTimer` memory decaying.
3. **Sneak vs. stomp.** Move normally near the guard (it hears you → `investigate`), then
   `Reset` and try with `Shift` held (silent). Perception quality changes its whole plan.
4. **Trigger the human-in-the-loop.** Corner it, `Space` to shove it below 30 HP, then try
   **Approve** vs **Deny** and see how its behaviour forks.
5. **Edit the brain.** In `index.html`, reorder the `patrol` transitions so `sees` comes
   *after* `hears`, or raise `VISION_RANGE` / widen the cone (`CONE_COS`). Reload. The
   agent's "personality" is just data.
6. **Add a state.** Give it a `taunt` state it enters from `attack` every few ticks. If you
   can do this, you understand FSMs.

---

## From toy brain to a real LLM (Ollama)

The guard's "brain" here is a deterministic policy (pure functions in `guards`), so the
game needs no network and no key. But the *wiring* is identical to an LLM agent: perception
in → a decision out → the FSM routes on it.

To see the LLM version, look at the main repo. The examples there call a **local LLM via
Ollama** (see `../src/llm.ts`). The only real difference:

```
Dungeon Guardian:   decision = guards[...]( perception )        // instant, deterministic
writer.ts:          decision = await ollama.chat(... tools ...)  // an LLM picks the action
```

In both cases the **state machine stays in charge** — it decides which decisions are even
allowed from the current state, handles errors, and enforces the human-in-the-loop. That's
the whole thesis of this repo: *let the LLM be creative inside a structure that stays
reliable.*

To run the LLM-powered examples from the repo root:

```bash
ollama pull llama3.1:8b     # a tool-capable local model (already on your machine)
npm install
npm run dev                 # open the printed URL, pick an agent, press "Invoke"
```

No OpenAI key needed — it all talks to `http://localhost:11434`. Change the model any time
with `VITE_OLLAMA_MODEL` (see `../src/llm.ts`).

---

## Glossary (game word → concept → XState word)

| You see in the game | It means | XState term |
|---|---|---|
| the current state name (big, top-right) | what the agent is doing now | `state.value` |
| Memory / context panel | what the agent knows | `context` |
| the orange cone | what the agent can perceive | a tool / `fromPromise` actor result |
| purple "mem" square | last known player position | a `context` field set by `assign` |
| a log line `A --TICK--> B` | a transition fired | a transition |
| the operator Approve/Deny card | human-in-the-loop | an event the machine waits for |
| `Step tick` button | advance one decision | one `actor.send()` |

Have fun outsmarting the state machine. When you can reliably predict its next transition,
you *understand* agentic state machines. 🎉
