import {
  PromptEnhancementError,
  type PromptEnhancementRequest,
  PromptEnhancementResult,
} from "@t3tools/contracts";
import { resolvePromptEnhancementModelSelection } from "@t3tools/shared/serverSettings";
import { limitSection } from "@t3tools/provider-core/server/textGenerationUtils";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ServerSettings from "../serverSettings.ts";
import { buildPromptEnhancementPrompt } from "./PromptEnhancementPrompt.ts";
import * as TextGeneration from "./TextGeneration.ts";

const isResult = Schema.is(PromptEnhancementResult);
const RECENT_MESSAGE_LIMIT = 12;
const MESSAGE_EXCERPT_LENGTH = 1_600;

export class PromptEnhancement extends Context.Service<
  PromptEnhancement,
  {
    readonly enhance: (
      input: PromptEnhancementRequest,
    ) => Effect.Effect<PromptEnhancementResult, PromptEnhancementError>;
  }
>()("t3/textGeneration/PromptEnhancement") {}

const make = Effect.gen(function* () {
  const settingsService = yield* ServerSettings.ServerSettingsService;
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const fileSystem = yield* FileSystem.FileSystem;
  const textGeneration = yield* TextGeneration.TextGeneration;

  return PromptEnhancement.of({
    enhance: Effect.fn("PromptEnhancement.enhance")(
      function* ({ text, threadId }) {
        if (text.trim().length === 0) {
          return yield* new PromptEnhancementError({ reason: "empty-draft" });
        }
        const entries =
          threadId === undefined
            ? []
            : (yield* threads
                .getTimelinePage(threadId, {
                  view: "messages",
                  beforePosition: Number.POSITIVE_INFINITY,
                  limit: RECENT_MESSAGE_LIMIT,
                })
                .pipe(
                  Effect.mapError(
                    (cause) => new PromptEnhancementError({ reason: "context-unavailable", cause }),
                  ),
                )).items;
        const recent = entries.flatMap(({ item }) => {
          if (
            (item.type !== "user_message" && item.type !== "assistant_message") ||
            (item.type === "user_message" ? item.workflowScript === true : item.streaming) ||
            item.text.trim().length === 0
          )
            return [];
          return [
            {
              role: item.type === "user_message" ? ("user" as const) : ("assistant" as const),
              text: limitSection(item.text, MESSAGE_EXCERPT_LENGTH),
            },
          ];
        });
        const settings = yield* settingsService.getSettings;
        const { mode, customInstructions } = settings.promptEnhancementPrompt;
        const { prompt, restore } = buildPromptEnhancementPrompt(
          text,
          recent,
          mode === "custom" ? customInstructions : "",
        );
        const cwd = yield* fileSystem.makeTempDirectoryScoped({ prefix: "t3-prompt-enhancement-" });
        const generated = yield* textGeneration.generatePromptEnhancement({
          cwd,
          prompt,
          modelSelection: resolvePromptEnhancementModelSelection(settings),
        });
        const restored = restore(generated.text);
        if (restored === undefined) {
          return yield* new PromptEnhancementError({ reason: "references-changed" });
        }
        const result = { text: restored };
        if (restored.length === 0 || !isResult(result)) {
          return yield* new PromptEnhancementError({ reason: "invalid-output" });
        }
        return result;
      },
      Effect.scoped,
      Effect.mapError((cause) =>
        cause._tag === "PromptEnhancementError"
          ? cause
          : new PromptEnhancementError({ reason: "generation-failed", cause }),
      ),
    ),
  });
});

export const layer = Layer.effect(PromptEnhancement, make);
