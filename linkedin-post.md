# LinkedIn Post — Agentic Finite State Machines

## Post

**Most people think an "AI agent" is just a prompt running in a loop.**

I thought so too — until I tried to make one *reliable*. That's when I learned about **Agentic Finite State Machines (FSMs)**, and it changed how I think about building with LLMs.

Here's the core idea I kept coming back to:

> **An agent = an Actor + a brain (LLM) + a State Machine.**

An LLM on its own is creative but unpredictable. A finite state machine is the opposite: boring, deterministic, and completely inspectable. Put them together and you get the best of both — the LLM makes the *decisions*, the state machine decides which decisions are even *allowed* right now, handles errors, and keeps everything observable.

Every agent runs the same loop:

🟢 **Sense** → gather info (call a tool)
🟡 **Think** → pick the next transition (guards)
🔵 **Act** → update memory, take an action

Building this way, a few patterns suddenly clicked:

• **Tool use** — the agent must fetch data before it can answer
• **Memory** — state carried in "context" across steps
• **Reflection** — a writer and a critic improving each other's output
• **Human-in-the-loop** — the machine literally *pauses* in a state and waits for a human to approve before acting
• **Orchestration** — a planner routing work to specialist sub-agents

To make it tangible, I built a small game — **Dungeon Guardian** — where the enemy guard IS an agentic state machine (patrol → chase → search → attack). You can watch it think in real time: its perception cone, its memory of your last position, every state transition logged live. Turns out the "boring" game-AI FSMs from 20 years ago are the exact same backbone modern AI agents need.

Then I took it further: refactored it into a proper monorepo where every state machine runs on the backend, is exposed as its own HTTP + WebSocket endpoint, and talks to a **local LLM via Ollama** — no cloud, no API keys.

Biggest lesson: **don't reach for a heavy agent framework first.** FSMs are a 50-year-old, language-agnostic tool every engineer already understands. Master the pattern and you can build agents in any stack.

Structure doesn't limit intelligence. It's what makes intelligence *trustworthy*.

Repos in the comments 👇

`#AI #AgenticAI #LLM #StateMachines #XState #SoftwareEngineering #Ollama #BuildInPublic`

---

## Suggested first comment

(Links get better reach in the first comment than in the post body.)

> Code if you want to dig in:
> • AutomataAgents (server-side agents + playable game): https://github.com/kalidask21/automata-agents
> • Original pattern library: https://github.com/kalidask21/AgenticStateMachines
