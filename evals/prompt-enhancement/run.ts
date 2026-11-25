import * as NodeUtil from "node:util";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { CodexSettings, ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Random from "effect/Random";
import * as Schema from "effect/Schema";

import * as ServerConfig from "../../apps/server/src/config.ts";
import { makeCodexTextGeneration } from "../../apps/server/src/textGeneration/CodexTextGeneration.ts";
import { buildPromptEnhancementPrompt } from "../../apps/server/src/textGeneration/PromptEnhancementPrompt.ts";
import { cases } from "./cases.ts";

const { values } = NodeUtil.parseArgs({
  options: {
    out: { type: "string" },
    model: { type: "string" },
    baseline: { type: "string" },
    case: { type: "string" },
    samples: { type: "string", default: "3" },
  },
});
const { out, model } = values;
const samples = Number(values.samples);
const fixtures = cases.filter((fixture) => values.case === undefined || fixture.id === values.case);
if (!out || !model || !fixtures.length || !Number.isSafeInteger(samples) || samples < 1) {
  throw new Error(
    "Use --out <directory> --model <configured-model> [--case <id>] [--samples <count>].",
  );
}

const Result = Schema.Struct({
  id: Schema.String,
  sample: Schema.Number,
  text: Schema.NullOr(Schema.String),
});
const decodeResults = Schema.decodeEffect(Schema.fromJsonString(Schema.Array(Result)));
const decodeSettings = Schema.decodeEffect(CodexSettings);
const encodeRows = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

await Effect.runPromise(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-prompt-eval-" });
    const service = yield* makeCodexTextGeneration(yield* decodeSettings({}));
    const baseline = values.baseline
      ? yield* fs.readFileString(values.baseline).pipe(Effect.flatMap(decodeResults))
      : [];
    const results: Array<typeof Result.Type> = [];
    const review = [];
    const key = [];
    for (const fixture of fixtures) {
      const { prompt, restore } = buildPromptEnhancementPrompt(
        fixture.draft,
        fixture.recentConversation,
        fixture.customInstructions,
      );
      for (let sample = 1; sample <= samples; sample++) {
        const previous = baseline.find((row) => row.id === fixture.id && row.sample === sample);
        if (values.baseline && previous === undefined) {
          throw new Error(`Missing baseline for ${fixture.id} sample ${sample}.`);
        }
        const generated = yield* service.generatePromptEnhancement({
          cwd,
          prompt,
          modelSelection: { instanceId: ProviderInstanceId.make("codex"), model },
        });
        const text = generated.text.trim() ? (restore(generated.text) ?? null) : null;
        results.push({ id: fixture.id, sample, text });
        const first = previous === undefined || (yield* Random.nextBoolean);
        review.push({
          ...fixture,
          sample,
          A: first ? text : previous?.text,
          B: first ? previous?.text : text,
        });
        key.push({ id: fixture.id, sample, candidate: first ? "A" : "B" });
      }
    }
    yield* fs.makeDirectory(out, { recursive: true });
    for (const [name, rows] of [
      ["results", results],
      ["review", review],
      ["answer-key", key],
    ] as const) {
      yield* fs.writeFileString(path.join(out, name + ".json"), yield* encodeRows(rows));
    }
  }).pipe(
    Effect.provide(
      ServerConfig.layerTest(process.cwd(), { prefix: "t3-prompt-eval-state-" }).pipe(
        Layer.provideMerge(NodeServices.layer),
      ),
    ),
    Effect.scoped,
  ),
);
