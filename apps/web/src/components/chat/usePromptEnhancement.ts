import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { useGT, useMessages } from "gt-react";
import { useEffect, useRef, useState } from "react";

import { useStableCallback } from "../../hooks/useStableCallback";
import { promptEnhancement } from "../../state/promptEnhancement";
import { useAtomCommand } from "../../state/use-atom-command";
import { chatActionErrorMessage } from "../ChatView.logic";
import { toastManager } from "../ui/toast";

export type PromptEnhancementState = "idle" | "enhancing" | "enhanced";

type Phase =
  | { readonly kind: "idle" }
  | { readonly kind: "enhancing"; readonly draftKey: string }
  | {
      readonly kind: "enhanced";
      readonly draftKey: string;
      readonly original: string;
      readonly enhanced: string;
    };

/**
 * Rewrites the whole draft through the environment's enhancement model. The result replaces the
 * draft only if it is still the text that was sent, and undo stays offered until the next edit.
 */
export function usePromptEnhancement(input: {
  readonly environmentId: EnvironmentId;
  /** Server threads lend their recent turns as context; drafts send only the text. */
  readonly threadId: ThreadId | null;
  readonly draftKey: string;
  readonly prompt: string;
  readonly disabled: boolean;
  readonly readPrompt: () => string;
  /** Replaces `expected` with `next`; false when the draft no longer matches `expected`. */
  readonly replacePrompt: (expected: string, next: string) => boolean;
}) {
  const gt = useGT();
  const m = useMessages();
  const enhance = useAtomCommand(promptEnhancement.enhance, { reportFailure: false });
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  const state: PromptEnhancementState =
    phase.kind === "enhancing" && phase.draftKey === input.draftKey
      ? "enhancing"
      : phase.kind === "enhanced" &&
          phase.draftKey === input.draftKey &&
          phase.enhanced === input.prompt
        ? "enhanced"
        : "idle";
  const canEnhance = !input.disabled && input.prompt.trim().length > 0;

  // The request outlives the render that started it, so its result goes through these latest-render
  // callbacks rather than that render's `input`.
  const isCurrentDraft = useStableCallback((draftKey: string) => draftKey === input.draftKey);
  const replacePrompt = useStableCallback((expected: string, next: string) =>
    input.replacePrompt(expected, next),
  );

  const cancel = useStableCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPhase({ kind: "idle" });
  });

  const start = useStableCallback(async () => {
    if (input.disabled || state === "enhancing") return;
    const original = input.readPrompt();
    if (original.trim().length === 0) return;
    const draftKey = input.draftKey;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase({ kind: "enhancing", draftKey });
    const result = await enhance(
      {
        environmentId: input.environmentId,
        input:
          input.threadId === null
            ? { text: original }
            : { text: original, threadId: input.threadId },
      },
      { signal: controller.signal },
    );
    // Cancelled, or a newer request took over.
    if (controllerRef.current !== controller) return;
    controllerRef.current = null;
    if (!AsyncResult.isSuccess(result)) {
      setPhase({ kind: "idle" });
      if (Cause.hasInterruptsOnly(result.cause)) return;
      toastManager.add({
        type: "error",
        title: gt("Couldn't enhance the prompt"),
        description: chatActionErrorMessage(Cause.squash(result.cause), m),
      });
      return;
    }
    const enhanced = result.value.text;
    if (
      enhanced.trim().length === 0 ||
      enhanced === original ||
      !isCurrentDraft(draftKey) ||
      !replacePrompt(original, enhanced)
    ) {
      setPhase({ kind: "idle" });
      return;
    }
    setPhase({ kind: "enhanced", draftKey, original, enhanced });
  });

  const undo = useStableCallback(() => {
    if (state !== "enhanced" || phase.kind !== "enhanced") return;
    replacePrompt(phase.enhanced, phase.original);
    setPhase({ kind: "idle" });
  });

  /** The button and the shortcut share one action: start, cancel, or undo. */
  const toggle = useStableCallback(() => {
    if (state === "enhancing") cancel();
    else if (state === "enhanced") undo();
    else void start();
  });

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Esc is a window key listener, live only while a request runs
  useEffect(() => {
    if (state !== "enhancing") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      cancel();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [state, cancel]);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- aborts an in-flight request when the composer unmounts
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  return {
    state,
    canEnhance,
    /** The editor waits for the result so it cannot drift from the text being rewritten. */
    freezesEditor: state === "enhancing",
    toggle,
  };
}
