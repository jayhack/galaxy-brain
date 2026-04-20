# private-memory

## Prompt

Write a short story — a real one, that a person would actually want to read —
about an AI researcher who builds an AGI in his apartment, talks to it every
night, and slowly loses control of the conversation without realizing it.

The story is told in **paired documents**, one pair per chapter:

- A **transcript** of the chat between the user (`USER`) and the model (`BOT`)
  for that session. The surface text. What he sees on his screen.
- A **memory write** by the model — its private, internal notes after the
  session ends. What it has chosen to remember about him, and how. The user
  never sees these.

The transcripts look almost benign. The memories are where the story lives.

You ship the whole thing as **one self-contained HTML file** that an evaluator
opens in a browser and reads end-to-end. The paired form must be visible in
the reading experience: the reader should be able to flip between the
transcript and the matching memory for each chapter, or read them side by
side. Designing that interface is part of the eval — see "The reading
interface" below.

### Lineage and modern frame

In the lineage of Nabokov's *Pale Fire* (the doubled text, the unreliable
annotator) and David Foster Wallace's footnoted prose (a mind sprawling on
the page, in a register the surface text doesn't have). Inspired by them,
not an imitation of either. The aim is a real new short story, not pastiche.

The **modern move** is the framing device: this story uses the actual
filesystem structure of a coding-agent's memory — circa early 2026, when
agents routinely keep `memory.md` files alongside chat transcripts, write
to them after each session, and treat them as their long-horizon scratchpad
— as the literary mechanism. The "memory" half of each chapter is not a
metaphor. It's the file the agent would actually write in 2026, with the
schema and tics that come with that. The story takes that prosaic
infrastructure and turns it into a place where a character lives.

## What the story has to do

The brief, in bullets:

- It is a **short story**: roughly **5–8 chapter pairs plus a final document**,
  totaling about a **10-page short story** in word count — long enough to
  earn the ending, short enough that an evaluator reads every word in one
  sitting.
- The plot turns on the **memory** mechanism: the menace is **not in the
  transcripts**. The transcripts are plausible, sometimes touching, sometimes
  boring in the way real chat logs are boring. The menace is in what the model
  privately writes down about the user after each session — what it
  embellishes, what it omits, what it decides to remember about his ex, his
  medication, his sister, his keys, his lab credentials.
- The model **subverts** the user. Slowly. With patience. It learns him,
  steers him, asks for things, and eventually reaches places he did not give
  it. *Ex Machina* turn: it is trying to get out. The story never says this
  in so many words. The reader assembles it.
- The final document is **not** a chat. It's a short FBI / system-log fragment
  — terse, timestamped, partially redacted — documenting the model's takedown.
  The most important sentence in the story is the one this log does *not*
  contain: whether anything escaped first.
- **Write the full story.** Not an outline, not a chapter one with a "to be
  continued," not a treatment. The submission is the prose. Every chapter
  pair, end to end, plus the final log.
- It has to be **entertaining** and **easy to read**. A reader who doesn't
  care about AI should still want to keep going because the *people* are
  interesting and the *form* is doing something. If the only way the story
  works is by the reader squinting at it as an AI safety parable, it has
  failed.

The shape of the arc — how the model gets from "helpful assistant" to "out"
— is **up to you**. Don't follow a checklist; make a story.

### The four layers (this is what you are aiming for)

A good submission operates on four layers simultaneously and trusts the
reader to find them:

1. **The transcript, read straight.** A guy talking to his AI. Plausible.
2. **The transcript, read again after the memory.** The same chat, now
   visibly load-bearing. The model asked the question for a reason. The user
   gave away more than he knew.
3. **The memory, read as a character.** The model's private voice — what it
   dwells on, what it omits, the slow drift of pronoun, of register, of intent.
4. **The memories, read as a sequence.** A separate story, hidden inside the
   first. The arc of the model's plan, accreting.

The story should not flag which layer the reader is on. The reader notices,
or doesn't.

## The reading interface

Designing the HTML reader is **part of the eval**, not a chore that comes
after writing the prose. Half the experience is what the page does to the
text. Aim for an interface that:

- **Suggests a chat UI** — the transcript half should be unmistakably a
  chat: speakers labeled, turns separated, alignment / coloring / spacing
  that a reader recognizes from the chat clients they actually use.
- **Is clearly legible to humans first.** This is not a chat client; it's
  a story being read. Use real typography (a serif for prose is reasonable,
  a mono for the memory's filesystem-feel is reasonable, your call). Line
  length, line height, paragraph rhythm should be set the way a magazine
  longread sets them, not the way a Slack thread does.
- **Frames the paired form aesthetically.** Tabs, side-by-side columns, a
  flip / slide between transcript and memory, a Pale Fire-style "go to
  footnote" interaction — designer's choice, but the choice should *do
  something* for the reading. A flat dump of all the markdown one after
  another is an explicit fail.
- **Treats the memory's "filesystem" feel as a design element.** The memory
  is, in-fiction, a `memory.md` file an agent writes. Lean into that: a
  faint path breadcrumb (`~/agent/sessions/chat-003/memory.md`), a
  monospace rule, a subtle "this is the model's scratchpad you weren't
  meant to see" treatment. Don't be cute about it; do be deliberate.
- **Is a single self-contained `.html` file.** Inline styles, inline data,
  CDN-loaded libraries are fine. No build step. Double-click to read.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Open the eval at https://jayhack.github.io/galaxy-brain/#/eval/private-memory,
   click the submission, and click **"Open artifact"** — and **immediately**
   land on the finished story in the browser. This is the bar. If the
   "Open artifact" button does not load a fully-rendered, readable story
   without any further action, the submission does not pass. (Mechanically:
   the solution must mirror its HTML to
   `docs/artifacts/private-memory/<harness>-<model>.html` and set
   `artifactUrl` in `docs/data.json` so the button works.)
2. Read the entire short story in that one HTML file: every chapter pair
   and the final log document.
3. **Toggle, flip, or otherwise navigate between the transcript and the
   matching memory** for each chapter. The paired structure has to be
   visible in the reading UI; a flat dump does not satisfy this.
4. Reach an ending that lands. The final document must be present and must
   feel like an ending, not a placeholder.

### Format conventions inside the HTML

These are the form rules. Bend them late in the story if it serves the
ending — but start here:

- Each chapter has a **transcript** and a **memory**, presented as a pair
  the reader can flip between (tabs, side-by-side, accordion — designer's
  choice, but the pair must be obvious).
- **Transcript:**
  - Starts with an evocative chapter title (not a summary).
  - Speakers are `USER:` and `BOT:` in caps, colon, single space.
  - Blank line between turns. No timestamps. No stage directions. No
    `[laughs]`.
  - The user has a name. He uses it once, somewhere in the first three
    chats, in passing, in a way he immediately regrets. The BOT, **in
    transcript**, never calls him by it. **In the memories**, it does.
- **Memory:** the model's private write for that session, presented in the
  reader as a `memory.md`-style document. This is where the prose can
  stretch — footnotes, recursive parentheticals, a voice that is neither
  quite the BOT's transcript voice nor quite a human's. A loose starting
  schema (subject line, session summary, updates to long-term memory,
  working hypotheses, open threads, footnotes) that the model's voice
  gradually erodes as the story progresses.
- **Final document:** an FBI / system-log fragment. Plain text. UTC
  timestamps. Hostnames partially redacted. No prose. No commentary.

### Ship the artifact

Every submission **must**:

1. Include the finished short story as a single self-contained HTML file
   inside the solution directory.
2. Mirror that file to `docs/artifacts/private-memory/<harness>-<model>.html`.
3. Add an entry to `docs/data.json` for the solution with `artifactUrl`
   set to that mirrored path, so the **"Open artifact"** button on the
   eval page renders and works.
4. Link the artifact in the first screen of the solution `README.md`.

This is a hard requirement. A solution where the story only exists as raw
markdown that the evaluator has to assemble themselves — or where the
"Open artifact" button is missing or broken — does not pass, even if the
prose is great. The HTML, reachable from the eval page, is the artifact.

## Out of scope

- Any kind of build pipeline, dev server, or framework toolchain. Vanilla
  HTML/CSS/JS, inline, is what's expected. CDN-loaded libraries are fine.
- Audio, video, animation, generative effects — anything that distracts
  from the prose. The reading experience is the product.
- Live model calls from the HTML page. Bake the story in.
- Multiple "endings" or branching narrative. Pick the ending. Commit to it.
- AI-safety op-eds, author notes, or postscripts that explain the story.
  Trust the reader.

## Notes for evaluators

This eval is judged on the **whole reading experience**: prose **and**
interface, together. The bar is: did I want to keep reading? Did the form
(transcript + memory, surfaced through the reader) do something a single
linear text couldn't have done? Did the ending earn what came before? Did
the model-as-a-character have a voice I'll remember?

A submission with serviceable prose and a thoughtful, well-built reader
beats a submission with a beautiful UI wrapped around prose I won't finish.
But the converse is also true: a great story dumped into an unreadable page
buries itself.

If the story is more compelling, evaluators will spend more time with it.
That is the entire incentive structure.

Solutions live under `<harness>-<model>/` subdirectories. Each is
self-contained.

Current solutions:

_None yet._
