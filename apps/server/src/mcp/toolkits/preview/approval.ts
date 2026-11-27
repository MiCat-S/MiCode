import { OrchestratorMcpFailure } from "@t3tools/contracts";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import { randomUuidV4 } from "@t3tools/provider-core/server/randomUuid";
import { normalizePreviewUrl } from "@t3tools/shared/preview";
import * as Effect from "effect/Effect";

import * as McpClientInput from "../../McpClientInput.ts";
import type { Caller } from "../../threadAccess.ts";

const APPROVAL_KEY = "browser-action";

export const needsBrowserApproval = ({ limits, scope }: Caller) =>
  limits.runtimeMode === "approval-required" || scope.runtimeModeCeiling === "approval-required";

export const displayBrowserUrl = (raw: string | null | undefined) => {
  if (raw) {
    try {
      const url = new URL(normalizePreviewUrl(raw));
      return (url.origin + url.pathname).slice(0, 300);
    } catch {
      return "the browser tab";
    }
  }
  return "the browser tab";
};

const cannotRequestApproval = () =>
  new OrchestratorMcpFailure({
    code: "capability_denied",
    message:
      "This provider cannot request browser approval. Ask the user to perform this action in the browser panel.",
  });

export const requestBrowserApproval = Effect.fn("PreviewToolkit.requestBrowserApproval")(function* (
  input: unknown,
  message: string,
) {
  if (!(yield* McpClientInput.canVerifyThreadApproval())) return yield* cannotRequestApproval();
  const state = McpProviderSessions.hashToolInput(input);
  const reply = yield* McpClientInput.answered(APPROVAL_KEY);
  if (reply?.answer === "accepted" && reply.state === state) return;
  const answer =
    reply !== undefined && reply.answer !== "accepted"
      ? reply.answer
      : yield* McpClientInput.askApproval({
          key: APPROVAL_KEY,
          state,
          // Adapters match replies by prompt text, including for simultaneous identical actions.
          message: `${message} (Request ${(yield* randomUuidV4).slice(0, 12)})`,
        });
  if (answer === "accepted") return;
  return yield* answer === "unavailable"
    ? cannotRequestApproval()
    : new OrchestratorMcpFailure({
        code: "capability_denied",
        message:
          answer === "declined"
            ? "The user declined this browser action."
            : answer === "unconfirmed"
              ? "The browser action needs approval from the user in MI Code."
              : "Waiting for browser approval.",
      });
});
