import * as Effect from "effect/Effect";
import * as Preview from "../../../preview/Manager.ts";
import { requireThreadMcpCapability } from "../../McpInvocationContext.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import { unavailable } from "../../threadAccess.ts";
import {
  displayBrowserUrl,
  needsBrowserApproval,
  requestBrowserApproval,
} from "../preview/approval.ts";
import { PreviewControlsToolkit } from "./tools.ts";
import * as PreviewAutomationBroker from "../../PreviewAutomationBroker.ts";

const access = Effect.gen(function* () {
  const scope = yield* requireThreadMcpCapability("preview");
  return { scope, manager: yield* Preview.PreviewManager };
});
export const layer = McpToolAccess.toLayer(PreviewControlsToolkit, {
  t3_preview_list: McpToolAccess.readsAsCaller((input) =>
    Effect.gen(function* () {
      const { scope, manager } = yield* access;
      const result = yield* manager.list({ threadId: scope.thread.threadId });
      const start = input.cursor ?? 0;
      const end = start + (input.limit ?? 20);
      return {
        ...result,
        sessions: result.sessions.slice(start, end),
        nextCursor: end < result.sessions.length ? end : null,
      };
    }),
  ),
  t3_preview_close: McpToolAccess.actsAsCaller((input, caller) =>
    Effect.gen(function* () {
      const { scope, manager } = yield* access;
      const { sessions } = yield* manager.list({ threadId: scope.thread.threadId });
      const tab = sessions.find((session) => session.tabId === input.tabId);
      if (needsBrowserApproval(caller)) {
        const raw = tab?.navStatus._tag === "Idle" ? undefined : tab?.navStatus.url;
        yield* requestBrowserApproval(
          { operation: "close", input, url: raw },
          `Allow the agent to close ${displayBrowserUrl(raw)}?`,
        );
      }
      if (tab?.runtime === "server") {
        const broker = yield* PreviewAutomationBroker.PreviewAutomationBroker;
        yield* broker.invoke({ scope, operation: "close", input: {}, tabId: input.tabId });
        return {};
      }
      yield* manager
        .close({ threadId: scope.thread.threadId, tabId: input.tabId })
        .pipe(Effect.mapError(unavailable));
      return {};
    }),
  ),
});
