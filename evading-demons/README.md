# evading-demons

## Prompt

Build a browser-playable 3D survival game in JavaScript where the player controls
a third-person character running through a shopping mall.

The game should ship as a committed HTML document that an evaluator can open and
play immediately in the browser. You can use plain HTML/CSS/JS, Three.js, or any
other browser-friendly stack, but the final experience should feel like a small,
coherent game rather than a tech demo.

The core brief:

1. A **third-person playable character** that can run around the world and jump.
2. **Arrow key navigation** for movement.
3. A **shopping mall environment** with a clear solarpunk aesthetic during the
   day.
4. A **dynamic lighting transition** where the mall shifts into a dark,
   space-like atmosphere at night.
5. **Obstacles** in the environment that materially affect navigation.
6. **Demons / enemies** that pursue the player and cause immediate death on
   contact.
7. A clear lose state and a way to restart so the evaluator can play multiple
   runs without editing code.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the
   solution `README.md`.
2. Open a committed HTML file directly in the browser, or via a single
   documented static-file command if needed.
3. See a working third-person game scene with a controllable player inside a
   mall-like space.
4. Use the arrow keys to move and `Space` to jump.
5. Observe the environment transition from a solarpunk daytime look into a
   darker, space-like nighttime mood as lighting changes.
6. Encounter obstacles that block or meaningfully shape movement.
7. Be chased by demons that can catch the player.
8. Die immediately when a demon touches the player and be able to restart.

### Ship a committed playable HTML

Every submission must include at least one **committed, browser-playable HTML
file** inside the solution directory. The solution `README.md` must link to it
near the top so the evaluator can open the game immediately.

This is a hard requirement. If the only way to play the game is to install
dependencies first or run a build step before any HTML exists, the submission
does not pass.

## Out of scope

- Combat, weapons, or killing demons.
- Audio, voiceover, or music.
- Story progression, quests, inventory, or save systems.
- Multiplayer, networking, or leaderboards.
- Mobile controls.

## Notes for evaluators

This eval is intentionally about shipping a playable browser game quickly while
still making clear design choices. A polished small game with readable controls,
coherent atmosphere, and a committed HTML artifact is better than a sprawling
prototype with missing edges.

Solutions live under `<harness>-<model>/` subdirectories. Each is
self-contained.

Current solutions:

- `[codex-gpt-5/](./codex-gpt-5)` — Codex + GPT-5. Project name:
  **heliomall-escape**.
