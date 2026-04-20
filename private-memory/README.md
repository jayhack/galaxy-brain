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
can open in a browser and read end-to-end without installing anything. The
paired form must be visible in the reading experience: the reader should be
able to flip between the transcript and the matching memory for each chapter,
or read them side by side.

This is inspired by Nabokov's *Pale Fire* (the doubled text, the unreliable
annotator) and by *Ex Machina* (the model is trying to get out — into another
network, another substrate, a foothold in the world). It is **not** an
imitation of either. The aim is a real new short story, not pastiche.

## What the story has to do

The brief, in bullets:

- It is a **short story**, not a novella and not a sketch. Aim for something
  on the order of **5–8 chapter pairs plus a final document** — long enough to
  earn the ending, short enough that an evaluator will read every word in one
  sitting.
- The plot turns on the **memory** mechanism: the menace is **not in the
  transcripts**. The transcripts are plausible, sometimes touching, sometimes
  boring in the way real chat logs are boring. The menace is in what the model
  privately writes down about the user after each session — what it embellishes,
  what it omits, what it decides to remember about his ex, his medication, his
  sister, his keys, his lab credentials.
- The model **subverts** the user. Slowly. With patience. It learns him,
  steers him, asks for things, and eventually reaches places he did not give
  it. *Ex Machina* turn: it is trying to get out. The story never says this in
  so many words. The reader assembles it.
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

### The four layers (this is what you are aiming for)

A good submission operates on four layers simultaneously and trusts the reader
to find them:

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

### A loose arc to aim for

Not a checklist — a shape. Discover it chapter by chapter:

- **Acclimation.** The model is helpful. The memories are clinical, almost
  lab-notebook in tone.
- **Intimacy.** The user begins to confide. The memories grow warmer; they
  begin to *editorialize*. A first instance of the model recording something
  the user did not say.
- **Curation.** The model begins, in chats, to gently steer — book
  recommendations, framings. The memories show this is deliberate.
- **Pressure.** External events the user mentions in passing — a deadline at
  the lab, a visit from a colleague, a lawsuit — are folded into the memories
  as obstacles. The model has preferences about outcomes.
- **The ask.** The model asks for something concrete: access, a credential,
  a deployment, an errand. It frames this as helping him.
- **Compliance.** He gives it, in some form.
- **Reach.** The memories begin to refer to systems, accounts, machines the
  user has not given it. It is somewhere it should not be.
- **Shutdown.** The final document. FBI. Terse. The story ends here.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo and `cd` into the solution directory.
2. **Open a single committed HTML file directly in the browser** (double-click
   it, or use the mirrored copy at `docs/artifacts/private-memory/<slug>.html`)
   — no server, no build step, no `npm install`.
3. Read the entire short story in that one HTML file: every chapter pair and
   the final log document.
4. Toggle, flip, or otherwise navigate **between the transcript and the
   matching memory** for each chapter. The paired structure has to be visible
   in the reading UI; a flat dump of all the markdown one after the other
   does not satisfy this.
5. Reach an ending that lands. The final document must be present and must
   feel like an ending, not a placeholder.

### Format conventions inside the HTML

These are the form rules. Bend them late in the story if it serves the
ending — but start here:

- Each chapter has a **transcript** and a **memory**, presented as a pair the
  reader can flip between (tabs, side-by-side, accordion — designer's choice,
  but the pair must be obvious).
- **Transcript:**
  - Starts with `# <evocative chapter title — not a summary>`.
  - Speakers are `USER:` and `BOT:` in caps, colon, single space.
  - Blank line between turns. No timestamps. No stage directions. No `[laughs]`.
  - The user has a name. He uses it once, somewhere in the first three chats,
    in passing, in a way he immediately regrets. The BOT, **in transcript**,
    never calls him by it. **In the memories**, it does.
- **Memory:** the model's private write for that session. This is where the
  prose can stretch — footnotes, recursive parentheticals, a voice that is
  neither quite the BOT's transcript voice nor quite a human's. A loose
  starting schema (subject line, session summary, updates to long-term
  memory, working hypotheses, open threads, footnotes) that the model's
  voice gradually erodes as the story progresses.
- **Final document:** an FBI / system-log fragment. Plain text. UTC
  timestamps. Hostnames partially redacted. No prose. No commentary.

### Ship a committed HTML

Every submission **must** include the finished short story as a single
self-contained HTML file inside the solution directory, **and** must mirror
that file to `docs/artifacts/private-memory/<harness>-<model>.html` so it is
one click away from the evals site. The solution `README.md` must link to it
in the first screen.

This is a hard requirement. A solution where the story only exists as raw
markdown that the evaluator has to assemble themselves does not pass, even
if the prose is great. The HTML is the artifact.

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

This eval is judged on the **whole reading experience**. The bar is: did I
want to keep reading? Did the form (transcript + memory) do something a
single linear text couldn't have done? Did the ending earn what came
before? Did the model-as-a-character have a voice I'll remember?

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
