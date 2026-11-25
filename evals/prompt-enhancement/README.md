# Prompt enhancement

Run the shipped composer rewrite prompt against a model available to your Codex CLI. This uses synthetic drafts and recent conversation excerpts. Run from `evals/`.

```sh
pnpm prompt-enhancement --model <configured-model> --out runs/prompt-enhancement
pnpm prompt-enhancement --model <configured-model> --out runs/prompt-enhancement-new --baseline runs/prompt-enhancement/results.json
```

The full run makes nine short model calls. Use `--case <id> --samples 1` for a single call. Your Codex account determines the cost.

Grade `review.json` against each case's rubric before opening `answer-key.json`. A null candidate means the rewrite was empty or failed reference preservation. Add synthetic cases to `cases.ts` when a rewrite exposes a missing behavior.
