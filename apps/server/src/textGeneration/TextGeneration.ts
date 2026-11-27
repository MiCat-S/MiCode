import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ModelSelection, ProjectId } from "@t3tools/contracts";
import {
  isProviderAvailable,
  isProviderTextGenerationCapable,
  resolveTextGenerationSelectionEnabled,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import { exhaustedUsageWindow } from "@t3tools/shared/usageLimits";
import * as ServerSettings from "../serverSettings.ts";
import type { ProviderTextGeneration } from "@t3tools/provider-core/server/textGeneration";
import { TextGenerationError } from "@t3tools/contracts";

import * as ProviderInstallationGate from "../provider/ProviderInstallationGate.ts";
import * as ProviderInstanceRegistry from "../provider/ProviderInstanceRegistry.ts";
import * as SourceControlProviderRegistry from "../sourceControl/SourceControlProviderRegistry.ts";
import * as ThreadTitleLinks from "./ThreadTitleLinks.ts";
import * as TextGenerators from "./TextGenerators.ts";
import * as TextGenerationOperations from "@t3tools/provider-core/server/textGenerationOperations";

export type {
  BranchNameGenerationInput,
  BranchNameGenerationResult,
  CommitMessageGenerationInput,
  CommitMessageGenerationResult,
  PrContentGenerationInput,
  PrContentGenerationResult,
  ReviewGuideGenerationInput,
  ReviewGuideGenerationResult,
  ThreadTitleGenerationInput,
  ThreadTitleGenerationResult,
  TranscriptionPostProcessingInput,
  TranscriptionPostProcessingResult,
} from "@t3tools/provider-core/server/textGeneration";

export class TextGeneration extends Context.Service<TextGeneration, ProviderTextGeneration>()(
  "t3/textGeneration/TextGeneration",
) {}

type TextGenerationOp = TextGenerationOperations.Operation;

/** @public */
export const make = Effect.gen(function* () {
  const registry = yield* ProviderInstanceRegistry.ProviderInstanceRegistry;
  const sourceControl = yield* SourceControlProviderRegistry.SourceControlProviderRegistry;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const installationGate = yield* ProviderInstallationGate.ProviderInstallationGate;
  const textGenerators = yield* TextGenerators.TextGenerators;
  const generate = Effect.fn("TextGeneration.generate")(function* <A>(
    operation: TextGenerationOp,
    selection: ModelSelection,
    projectId: ProjectId | null | undefined,
    invoke: (
      service: ProviderTextGeneration,
      modelSelection: ModelSelection,
    ) => Effect.Effect<A, TextGenerationError>,
  ) {
    const fail = (detail: string) => new TextGenerationError({ operation, detail });
    const textGenerator = yield* textGenerators.runner(selection.instanceId);
    if (textGenerator !== undefined) {
      if (operation === "generateReviewGuide") {
        return yield* fail(
          "Review guides need a coding agent that can read the checkout. Pick Codex or Claude as the review guide model in Settings → Source control & issues.",
        );
      }
      return yield* invoke(
        TextGenerationOperations.fromRunner("TextGenerator", textGenerator),
        selection,
      );
    }
    const settings = yield* serverSettings.getSettings.pipe(
      Effect.mapError(
        (cause) =>
          new TextGenerationError({ operation, detail: "Could not read model settings.", cause }),
      ),
    );
    if (!resolveTextGenerationSelectionEnabled(settings, projectId ?? null, selection.instanceId)) {
      return yield* fail(
        `Text generation provider '${selection.instanceId}' is disabled or missing. Choose an enabled provider in Settings.`,
      );
    }
    return yield* installationGate.execute(
      selection.instanceId,
      Effect.gen(function* () {
        const instance = yield* registry.getInstance(selection.instanceId);
        if (instance === undefined) {
          return yield* fail(
            `Text generation provider '${selection.instanceId}' is unavailable. Check Settings → Providers.`,
          );
        }
        const selected = yield* instance.snapshot.getSnapshot;
        if (
          !selected.enabled ||
          !isProviderAvailable(selected) ||
          (selected.status === "error" &&
            (!selected.installed || selected.auth.status === "unauthenticated"))
        ) {
          return yield* fail(
            `Text generation provider '${selection.instanceId}' is not ready. Check Settings → Providers.`,
          );
        }
        if (
          !isProviderTextGenerationCapable(selected) ||
          selected.models.find((model) => model.slug === selection.model)
            ?.supportsTextGeneration === false
        ) {
          return yield* fail(
            `Model '${selection.model}' does not support text generation. Choose another model in Settings.`,
          );
        }
        if (
          exhaustedUsageWindow(
            selected,
            DateTime.toEpochMillis(yield* DateTime.now),
            selection.model,
          )
        ) {
          return yield* fail(`Model '${selection.model}' has reached its usage limit.`);
        }
        return yield* invoke(instance.textGeneration, selection);
      }),
    );
  });
  return TextGeneration.of({
    generatePromptEnhancement: Effect.fn("TextGeneration.generatePromptEnhancement")(
      function (input) {
        return generate(
          "generatePromptEnhancement",
          input.modelSelection,
          null,
          (service, modelSelection) =>
            service.generatePromptEnhancement({ ...input, modelSelection }),
        );
      },
    ),
    generateCommitMessage: Effect.fn("TextGeneration.generateCommitMessage")(function (input) {
      return generate(
        "generateCommitMessage",
        input.modelSelection,
        input.projectId,
        (service, modelSelection) => service.generateCommitMessage({ ...input, modelSelection }),
      );
    }),
    generatePrContent: Effect.fn("TextGeneration.generatePrContent")(function (input) {
      return generate(
        "generatePrContent",
        input.modelSelection,
        input.projectId,
        (service, modelSelection) => service.generatePrContent({ ...input, modelSelection }),
      );
    }),
    generateBranchName: Effect.fn("TextGeneration.generateBranchName")(function (input) {
      return generate(
        "generateBranchName",
        input.modelSelection,
        input.projectId,
        (service, modelSelection) => service.generateBranchName({ ...input, modelSelection }),
      );
    }),
    generateReviewGuide: Effect.fn("TextGeneration.generateReviewGuide")(function (input) {
      return generate(
        "generateReviewGuide",
        input.modelSelection,
        input.projectId,
        (service, modelSelection) => service.generateReviewGuide({ ...input, modelSelection }),
      );
    }),
    generateTranscriptionPostProcessing: Effect.fn(
      "TextGeneration.generateTranscriptionPostProcessing",
    )(function (input) {
      return generate(
        "generateTranscriptionPostProcessing",
        input.modelSelection,
        null,
        (service, modelSelection) =>
          service.generateTranscriptionPostProcessing({ ...input, modelSelection }),
      );
    }),
    generateThreadTitle: Effect.fn("TextGeneration.generateThreadTitle")(function (input) {
      return generate(
        "generateThreadTitle",
        input.modelSelection,
        input.projectId,
        (textGeneration, modelSelection) =>
          Effect.gen(function* () {
            const linkedContext =
              input.linkedContext ??
              (yield* ThreadTitleLinks.resolveThreadTitleLinks(input).pipe(
                Effect.provideService(
                  SourceControlProviderRegistry.SourceControlProviderRegistry,
                  sourceControl,
                ),
              ));
            return yield* textGeneration.generateThreadTitle({
              ...input,
              linkedContext,
              modelSelection,
            });
          }),
      );
    }),
  });
});

export const layer = Layer.effect(TextGeneration, make).pipe(
  Layer.provideMerge(TextGenerators.layer),
);
