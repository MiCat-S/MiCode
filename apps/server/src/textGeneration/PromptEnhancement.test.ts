import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  MessageId,
  type OrchestrationV2ProjectedTurnItem,
  ProviderInstanceId,
  ThreadId,
  TurnItemId,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ThreadManagementService from "../orchestration-v2/ThreadManagementService.ts";
import * as ProviderRegistry from "../provider/ProviderRegistry.ts";
import * as ServerSettings from "../serverSettings.ts";
import * as PromptEnhancement from "./PromptEnhancement.ts";
import * as TextGeneration from "./TextGeneration.ts";

const threadId = ThreadId.make("existing-thread");
const modelSelection = { instanceId: ProviderInstanceId.make("rewrite"), model: "rewrite-model" };
const now = DateTime.makeUnsafe(0);

function assistantReply(
  text: string,
  position: number,
  streaming: boolean,
): OrchestrationV2ProjectedTurnItem {
  const id = TurnItemId.make(`reply-${position}`);
  return {
    position,
    visibility: "local",
    sourceThreadId: threadId,
    sourceItemId: id,
    item: {
      id,
      threadId,
      type: "assistant_message",
      messageId: MessageId.make(id),
      ordinal: position,
      status: streaming ? "running" : "completed",
      streaming,
      text,
      title: null,
      runId: null,
      nodeId: null,
      providerThreadId: null,
      providerTurnId: null,
      nativeItemRef: null,
      parentItemId: null,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
    },
  };
}

it.effect("enhances only the draft, with bounded, settled context when a thread is supplied", () =>
  Effect.gen(function* () {
    const read = assistantReply(`${"x".repeat(1_599)}🚀past the excerpt`, 0, false);
    const pending = assistantReply("work in progress", 1, true);
    const generatedPrompts: string[] = [];
    const serviceLayer = PromptEnhancement.layer.pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.mock(ThreadManagementService.ThreadManagementService)({
            getTimelinePage: (requestedThread, options) => {
              expect(requestedThread).toBe(threadId);
              expect(options).toEqual({
                view: "messages",
                beforePosition: Infinity,
                limit: 12,
              });
              return Effect.succeed({
                items: [read, pending],
                totalItems: 40,
                hasMore: false,
                hasEarlier: true,
              });
            },
          }),
          Layer.mock(TextGeneration.TextGeneration)({
            generatePromptEnhancement: (input) =>
              Effect.sync(() => {
                expect(input.modelSelection).toMatchObject(modelSelection);
                generatedPrompts.push(input.prompt);
                return { text: "Rewrite the draft." };
              }),
          }),
          Layer.mock(ProviderRegistry.ProviderRegistry)({ getProviders: Effect.succeed([]) }),
          ServerSettings.layerTest({
            textGenerators: {
              [modelSelection.instanceId]: {
                kind: "openaiCompatible",
                baseUrl: "http://127.0.0.1:18999/v1",
                enabled: true,
              },
            },
            textGenerationModelSelection: modelSelection,
            promptEnhancementPrompt: { mode: "custom", customInstructions: "Use short sentences." },
          }),
          NodeServices.layer,
        ),
      ),
    );
    yield* Effect.gen(function* () {
      const enhancer = yield* PromptEnhancement.PromptEnhancement;
      expect(yield* enhancer.enhance({ text: "rewrite this" })).toEqual({
        text: "Rewrite the draft.",
      });
      yield* enhancer.enhance({ text: "rewrite this", threadId });
      expect(generatedPrompts[0]).toContain("Use short sentences.");
      expect(generatedPrompts[0]).not.toContain('"recentConversation"');
      const contextPrompt = generatedPrompts[1]!;
      expect(contextPrompt).toContain('"role":"assistant"');
      expect(contextPrompt).toContain("x".repeat(1_599));
      expect(contextPrompt).not.toContain("past the excerpt");
      expect(contextPrompt).not.toContain("work in progress");
      expect(contextPrompt).not.toContain("\\ud83d");
    }).pipe(Effect.provide(serviceLayer));
  }),
);
