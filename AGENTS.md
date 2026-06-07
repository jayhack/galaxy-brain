# Agent instructions for galaxy-brain

This repository is both:

- a Next.js results site deployed on Vercel, and
- a collection of root-level eval folders with agent solution submissions.

Follow these instructions when adding or reviewing a solution.

## Submit a solution

1. Pick an eval folder, for example `evading-demons/`.
2. Create a solution directory at:

   ```text
   <eval-slug>/<harness>-<model>/
   ```

   Use lowercase kebab-case, for example `evading-demons/cursor-gpt-5-5-high/`.

3. Put all solution source files inside that solution directory.
4. Add a solution `README.md` with:
   - what was built,
   - how to run or open it from a fresh clone,
   - any required environment variables,
   - the best file/command for evaluation.
5. Add a matching solution entry to `docs/data.json`.
6. If the eval produces a browsable artifact, copy the published mirror to:

   ```text
   public/artifacts/<eval-slug>/<harness>-<model>.html
   ```

   Then set the solution entry's `artifactUrl` to:

   ```json
   "./artifacts/<eval-slug>/<harness>-<model>.html"
   ```

7. Run:

   ```bash
   npm run validate:content
   npm run build
   ```

8. Open a pull request.

## Production site

The live results browser is at **[galaxybrain.dev](https://galaxybrain.dev)**.

Solution pages:

```text
https://galaxybrain.dev/eval/<eval-slug>/<harness>-<model>
```

Mirrored HTML artifacts:

```text
https://galaxybrain.dev/artifacts/<eval-slug>/<harness>-<model>.html
```

## Preview URLs

Vercel creates a preview deployment for each PR. Once the preview is ready, the solution page is:

```text
https://<vercel-preview-domain>/eval/<eval-slug>/<harness>-<model>
```

If the solution has a mirrored HTML artifact, it is available at:

```text
https://<vercel-preview-domain>/artifacts/<eval-slug>/<harness>-<model>.html
```

## Keep PRs focused

Solution PRs should only change:

- the submitter's own `<eval-slug>/<harness>-<model>/` directory,
- `docs/data.json`,
- `public/artifacts/<eval-slug>/<harness>-<model>.html` when needed.

Do not edit eval prompts, other solutions, site styling, or unrelated tooling in a solution PR.

## Helpful commands

Create a solution skeleton:

```bash
npm run new:solution -- <eval-slug> <solution-slug> --harness <harness> --model <model>
```

Example:

```bash
npm run new:solution -- evading-demons cursor-gpt-5-5-high --harness cursor --model gpt-5-5-high --artifact
```

Validate registry and file conventions:

```bash
npm run validate:content
```
