/**
 * The hosted app's side of an agent sign-in on a T3 Connect environment: it reads the request
 * and sends the decision with the owner's own Connect session there, so no code is needed.
 */
import { msg } from "gt-i18n";
import { type MarkedText, markedTextEnglish } from "../errors/translatable.ts";
import type {
  AuthMcpApprovalDecisionRequest,
  AuthMcpApprovalDetails,
  AuthMcpAuthorizationRequest,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

/** The environment cannot be reached through T3 Connect with this account. */
export class ConnectMcpApprovalUnavailableError extends Schema.TaggedError<ConnectMcpApprovalUnavailableError>()(
  "ConnectMcpApprovalUnavailableError",
  { cause: Schema.Defect() },
) {
  override get message(): string {
    return markedTextEnglish(this.i18nMessage);
  }

  get i18nMessage(): MarkedText {
    return [msg("Could not reach that environment through T3 Connect with this account.")];
  }
}

export type ConnectMcpApprovalAnswer =
  | { readonly kind: "details"; readonly details: AuthMcpApprovalDetails }
  | { readonly kind: "redirect"; readonly url: string }
  /** The environment refused the request, with a message for the user. */
  | { readonly kind: "refused"; readonly message: string };

export type ConnectMcpApprovalCall =
  | { readonly kind: "approval"; readonly payload: AuthMcpAuthorizationRequest }
  | { readonly kind: "decision"; readonly payload: AuthMcpApprovalDecisionRequest };
