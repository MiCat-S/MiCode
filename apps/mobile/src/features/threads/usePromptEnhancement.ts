import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { thrownErrorMessage } from "@t3tools/client-runtime/errors";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/reactivity";
import { useGT, useMessages } from "gt-react-native";
import { useEffect, useRef, useState } from "react";

import * as Dialog from "../../components/ui/Dialog";
import { promptEnhancement } from "../../state/promptEnhancement";
import { useAtomCommand } from "../../state/use-atom-command";

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
 * Rewrites the whole draft through the environment's enhancement model. Drafts are addressed by
 * key, so the result lands only on the draft it came from and only if that draft is unchanged.
 */
export function usePromptEnhancement(input: {
  readonly environmentId: EnvironmentId;
  /** Server threads lend their recent turns as context; new tasks send only the text. */
  readonly threadId: ThreadId | null;
  readonly draftKey: string;
  readonly prompt: string;
  readonly disabled: boolean;
  /** Lands edits the native editor has not reported yet, such as a pending autocorrection. */
  readonly flushPendingInput: () => Promise<void>;
  readonly readDraft: (draftKey: string) => string;
  readonly writeDraft: (draftKey: string, text: string) => void;
}) {
  const gt = useGT();
  const messages = useMessages();
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

  const replaceDraft = (draftKey: string, expected: string, next: string) => {
    if (input.readDraft(draftKey) !== expected) return false;
    input.writeDraft(draftKey, next);
    return true;
  };

  const start = async () => {
    if (input.disabled) return;
    const draftKey = input.draftKey;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // Flush first so a pending iOS autocorrection is part of the text that gets rewritten.
    await input.flushPendingInput();
    if (controllerRef.current !== controller) return;
    const original = input.readDraft(draftKey);
    if (original.trim().length === 0) {
      controllerRef.current = null;
      return;
    }
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
      Dialog.alert(
        gt("Couldn't enhance the prompt"),
        thrownErrorMessage(Cause.squash(result.cause), messages) ?? gt("Try again in a moment."),
      );
      return;
    }
    const enhanced = result.value.text;
    if (
      enhanced.trim().length === 0 ||
      enhanced === original ||
      !replaceDraft(draftKey, original, enhanced)
    ) {
      setPhase({ kind: "idle" });
      return;
    }
    setPhase({ kind: "enhanced", draftKey, original, enhanced });
  };

  const toggle = () => {
    if (state === "enhancing") {
      controllerRef.current?.abort();
      controllerRef.current = null;
      setPhase({ kind: "idle" });
    } else if (state === "enhanced" && phase.kind === "enhanced") {
      replaceDraft(phase.draftKey, phase.enhanced, phase.original);
      setPhase({ kind: "idle" });
    } else {
      void start();
    }
  };

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
    canEnhance: !input.disabled && input.prompt.trim().length > 0,
    /** The draft waits for the result so it cannot drift from the text being rewritten. */
    locksDraft: state === "enhancing",
    toggle,
  };
}
