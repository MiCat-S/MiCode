import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import {
  PROVIDER_SEND_TURN_MAX_FILE_BYTES,
  PREVIEW_RECORDING_STOP_TIMEOUT_MS,
  PreviewAutomationRecordingTransferError,
  PreviewAutomationRecordingDesktopUpdateRequiredError,
  PreviewAutomationRecordingArtifact,
  PreviewAutomationActInputs,
  OrchestratorMcpFailure,
  type ToolActivityIcon,
  type ThreadId,
  type PreviewAutomationOperation,
  type PreviewAutomationOpenInput,
  type PreviewAutomationRecordingStatus,
  type PreviewAutomationResizeResult,
  type PreviewAutomationSetColorSchemeResult,
  type PreviewAutomationSnapshot,
  type PreviewAutomationSnapshotMetadata,
  type PreviewAutomationStatus,
  type PreviewTabId,
  INCOGNITO_BROWSER_PROFILE_ID,
} from "@t3tools/contracts";

import {
  parseAttachmentUuid,
  parseAttachmentFileExtension,
  PENDING_ATTACHMENT_THREAD_SEGMENT,
  toSafeThreadAttachmentSegment,
} from "../../../attachmentStore.ts";
import { resolveAttachmentRelativePath } from "../../../attachmentPaths.ts";
import * as ServerConfig from "../../../config.ts";
import * as BrowserUploadPaths from "../../../preview/BrowserUploadPaths.ts";
import * as McpInvocationContext from "../../McpInvocationContext.ts";
import * as McpToolAccess from "../../McpToolAccess.ts";
import * as PreviewAutomationBroker from "../../PreviewAutomationBroker.ts";
import { assertLiveCaller, loadCaller, type Caller } from "../../threadAccess.ts";
import { displayBrowserUrl, needsBrowserApproval, requestBrowserApproval } from "./approval.ts";
import { PreviewSnapshotToolkit, PreviewStandardToolkit, PreviewToolkit } from "./tools.ts";

/** Whether a preview the agent
 * said nothing about surfaces is the user's `browserAutoShowFloatingPreview`
 * preference, which is desktop-local and unreadable from here — filling in
 * `true` would silently override it for every `preview_open`.
 */
function normalizePreviewOpenInput(input: PreviewAutomationOpenInput): PreviewAutomationOpenInput {
  const open = input.open ?? input.show;
  return {
    ...input,
    ...(open === undefined ? {} : { open, show: open }),
    reuseExistingTab: input.reuseExistingTab ?? true,
  };
}

const invoke = Effect.fn("PreviewToolkit.invoke")(function* <A>(
  operation: PreviewAutomationOperation,
  input: unknown,
  timeoutMs?: number,
  tabId?: PreviewTabId,
): Effect.fn.Return<
  { result: A; toolIcon?: ToolActivityIcon },
  import("@t3tools/contracts").PreviewAutomationError,
  McpInvocationContext.McpInvocationContext | PreviewAutomationBroker.PreviewAutomationBroker
> {
  const scope = yield* McpInvocationContext.requireThreadMcpCapability("preview");
  const broker = yield* PreviewAutomationBroker.PreviewAutomationBroker;
  let targetTabId = tabId;
  const result = yield* broker.invoke<A>({
    onTargetTab: (resolvedTabId) => {
      targetTabId = resolvedTabId;
    },
    scope,
    operation,
    input,
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    ...(tabId === undefined ? {} : { tabId }),
  });
  if (["status", "open", "navigate", "snapshot"].includes(operation)) return { result };
  const statusTabId =
    (operation !== "evaluate" && typeof result === "object" && result !== null
      ? (result as { tabId?: PreviewTabId }).tabId
      : undefined) ?? targetTabId;
  const page = yield* broker
    .invoke<PreviewAutomationStatus>({
      scope,
      operation: "status",
      input: {},
      timeoutMs: 500,
      updateCurrentTab: false,
      ...(statusTabId === undefined ? {} : { tabId: statusTabId }),
    })
    .pipe(Effect.orElseSucceed(() => null));
  return {
    result,
    ...(page?.url && /^https?:\/\//i.test(page.url) && page.url.length <= 4096
      ? { toolIcon: { _tag: "website" as const, pageUrl: page.url } }
      : {}),
  };
});

const invokeTargeted = <A extends object>(
  operation: PreviewAutomationOperation,
  input: {
    readonly tabId?: PreviewTabId | undefined;
    readonly [key: string]: unknown;
  },
  timeoutMs?: number,
) => {
  const { tabId, ...operationInput } = input;
  return invoke<A>(operation, operationInput, timeoutMs, tabId).pipe(
    Effect.map(({ result, toolIcon }) => ({
      ...result,
      ...(toolIcon ? { toolIcon } : {}),
    })),
  );
};

const quote = Schema.encodeSync(Schema.fromJsonString(Schema.String));

const authorizeTabAction = Effect.fn("PreviewToolkit.authorizeTabAction")(function* (
  caller: Caller,
  action: string,
  input: { readonly tabId?: PreviewTabId | undefined },
  options?: {
    readonly approvalRequired?: boolean;
    readonly destination?: string;
    readonly files?: ReadonlyArray<string>;
  },
) {
  if (!options?.approvalRequired && !needsBrowserApproval(caller)) return input.tabId;
  const scope = yield* McpInvocationContext.requireThreadMcpCapability("preview");
  const broker = yield* PreviewAutomationBroker.PreviewAutomationBroker;
  const status = (tabId: PreviewTabId | undefined) =>
    broker.invoke<PreviewAutomationStatus>({
      scope,
      operation: "status",
      input: {},
      updateCurrentTab: false,
      ...(tabId === undefined ? {} : { tabId }),
    });
  const tab = yield* status(input.tabId);
  if (tab.tabId === null) {
    return yield* new OrchestratorMcpFailure({
      code: "invalid_request",
      message: "Open a preview tab before requesting approval for this browser action.",
    });
  }
  const destination = options?.destination;
  const files = options?.files ?? [];
  const target = destination
    ? `${displayBrowserUrl(tab.url)} → ${destination}`
    : displayBrowserUrl(tab.url);
  yield* requestBrowserApproval(
    { action, input, tabId: tab.tabId, url: tab.url, generation: tab.control?.generation, files },
    `Allow the agent to ${action} on ${target}?${files.map((file) => `\n${quote(file)}`).join("")}`,
  );
  const current = yield* status(tab.tabId);
  if (
    current.tabId !== tab.tabId ||
    current.url !== tab.url ||
    current.control?.generation !== tab.control?.generation
  ) {
    return yield* new OrchestratorMcpFailure({
      code: "invalid_request",
      message:
        "The browser tab changed during approval. Call the tool again to request a new approval.",
    });
  }
  return tab.tabId;
});

const invokeTabAction = <A extends object>(
  caller: Caller,
  operation: PreviewAutomationOperation,
  action: string,
  input: {
    readonly tabId?: PreviewTabId | undefined;
    readonly [key: string]: unknown;
  },
  timeoutMs?: number,
  destination?: string,
) =>
  authorizeTabAction(
    caller,
    action,
    input,
    destination === undefined ? undefined : { destination },
  ).pipe(Effect.flatMap((tabId) => invokeTargeted<A>(operation, { ...input, tabId }, timeoutMs)));

const decodeActInput = Record.map(PreviewAutomationActInputs, (schema) =>
  Schema.decodeUnknownEffect(schema),
);

const UploadedRecordingArtifact = Schema.Struct({
  ...PreviewAutomationRecordingArtifact.fields,
  uploadedAttachmentId: Schema.optional(Schema.String),
});
const decodeUploadedRecordingArtifact = Schema.decodeUnknownEffect(UploadedRecordingArtifact);

export const claimPreviewRecording = Effect.fn("PreviewToolkit.claimRecording")(function* (
  threadId: ThreadId,
  response: unknown,
) {
  const artifact = yield* decodeUploadedRecordingArtifact(response).pipe(
    Effect.mapError(
      (cause) =>
        new PreviewAutomationRecordingTransferError({
          threadId,
          cause,
        }),
    ),
  );
  if (!artifact.uploadedAttachmentId) {
    return yield* new PreviewAutomationRecordingDesktopUpdateRequiredError({ threadId });
  }
  const config = yield* ServerConfig.ServerConfig;
  const uuid = parseAttachmentUuid(artifact.uploadedAttachmentId);
  const extension = parseAttachmentFileExtension(artifact.uploadedAttachmentId);
  const threadSegment = toSafeThreadAttachmentSegment(threadId);
  const pendingId = `${PENDING_ATTACHMENT_THREAD_SEGMENT}-${uuid}-${extension}`;
  if (!uuid || !extension || !threadSegment || artifact.uploadedAttachmentId !== pendingId) {
    return yield* new PreviewAutomationRecordingTransferError({
      threadId,
    });
  }
  const finalId = `${threadSegment}-${uuid}-${extension}`;
  const currentPath = resolveAttachmentRelativePath({
    attachmentsDir: config.attachmentsDir,
    relativePath: `${pendingId}.${extension}`,
  });
  const finalPath = resolveAttachmentRelativePath({
    attachmentsDir: config.attachmentsDir,
    relativePath: `${finalId}.${extension}`,
  });
  if (!currentPath || !finalPath) {
    return yield* new PreviewAutomationRecordingTransferError({ threadId });
  }
  const fileSystem = yield* FileSystem.FileSystem;
  const validateFile = (filePath: string) =>
    fileSystem.stat(filePath).pipe(
      Effect.filterOrFail(
        (stat) =>
          stat.type === "File" &&
          Number(stat.size) === artifact.sizeBytes &&
          artifact.sizeBytes > 0 &&
          artifact.sizeBytes <= PROVIDER_SEND_TURN_MAX_FILE_BYTES,
        () => new PreviewAutomationRecordingTransferError({ threadId }),
      ),
    );
  yield* Effect.gen(function* () {
    yield* validateFile(currentPath);
    yield* fileSystem.rename(currentPath, finalPath);
  }).pipe(
    Effect.catchIf(
      (cause) =>
        cause._tag !== "PreviewAutomationRecordingTransferError" &&
        cause.reason._tag === "NotFound",
      () => validateFile(finalPath),
    ),
    Effect.mapError((cause) => new PreviewAutomationRecordingTransferError({ threadId, cause })),
  );
  const { uploadedAttachmentId: _uploadedAttachmentId, ...recording } = artifact;
  return { ...recording, id: finalId, path: finalPath };
});

const handlers = {
  preview_dialog: McpToolAccess.actsAsCaller((input, caller) =>
    invokeTabAction<PreviewAutomationStatus>(
      caller,
      "dialog",
      "respond to a browser dialog",
      input,
    ),
  ),
  preview_status: McpToolAccess.readsAsCaller((input) =>
    invokeTargeted<PreviewAutomationStatus>("status", input ?? {}),
  ),
  // Models often pass a dev server as both `url` and `target`; the target knows the environment.
  preview_open: McpToolAccess.actsAsCaller(({ target, url, ...input }, caller) =>
    Effect.gen(function* () {
      if (input.profileId?.toLowerCase() === INCOGNITO_BROWSER_PROFILE_ID) {
        input.profileId = INCOGNITO_BROWSER_PROFILE_ID;
      }
      const persistentProfile =
        input.profileId === INCOGNITO_BROWSER_PROFILE_ID ? undefined : input.profileId;
      if (persistentProfile !== undefined || needsBrowserApproval(caller)) {
        yield* McpInvocationContext.requireThreadMcpCapability("preview");
        const destination =
          target === undefined
            ? displayBrowserUrl(url)
            : displayBrowserUrl(
                `${target.protocol ?? "http"}://localhost:${target.port}${target.path ?? ""}`,
              );
        const profile =
          persistentProfile === undefined
            ? ""
            : ` using the ${quote(persistentProfile)} browser profile`;
        yield* requestBrowserApproval(
          { operation: "open", target, url, input },
          `Allow the agent to open ${destination}${profile}${(input.open ?? input.show) === false ? " in the background" : ""}?`,
        );
      }
      const opened = yield* invokeTargeted<PreviewAutomationStatus>(
        "open",
        normalizePreviewOpenInput(
          target === undefined && url !== undefined ? { ...input, url } : input,
        ),
      );
      if (target === undefined || opened.tabId === null) return opened;
      return yield* invokeTargeted<PreviewAutomationStatus>("navigate", {
        target,
        tabId: opened.tabId,
      });
    }),
  ),
  preview_navigate: McpToolAccess.actsAsCaller((input, caller) =>
    invokeTabAction<PreviewAutomationStatus>(
      caller,
      "navigate",
      "navigate",
      input,
      input.timeoutMs,
      input.target?.kind === "environment-port"
        ? displayBrowserUrl(
            `${input.target.protocol ?? "http"}://localhost:${input.target.port}${input.target.path ?? ""}`,
          )
        : displayBrowserUrl(
            input.url ?? (input.target?.kind === "url" ? input.target.url : undefined),
          ),
    ),
  ),
  preview_resize: McpToolAccess.actsAsCaller((input, caller) =>
    invokeTabAction<PreviewAutomationResizeResult>(
      caller,
      "resize",
      "resize the browser viewport",
      input,
      input.timeoutMs,
    ),
  ),
  preview_set_appearance: McpToolAccess.actsAsCaller((input, caller) =>
    invokeTabAction<PreviewAutomationSetColorSchemeResult>(
      caller,
      "setColorScheme",
      "change browser appearance",
      input,
    ),
  ),
  preview_snapshot: McpToolAccess.readsAsCaller((input) =>
    Effect.gen(function* () {
      const { includeImage, save, ...operationInput } = input ?? {};
      let tabId = operationInput.tabId;
      if (save === true) {
        const caller = yield* loadCaller();
        yield* assertLiveCaller(caller);
        tabId = yield* authorizeTabAction(caller, "save a browser screenshot", input);
      }
      // The saved file is for people, so it keeps the resolution the agent's image is capped below.
      return yield* invokeTargeted<PreviewAutomationSnapshot | PreviewAutomationSnapshotMetadata>(
        "snapshot",
        {
          tabId,
          ...(save === true ? { fullScreenshot: true } : {}),
          ...(includeImage === true || save === true ? {} : { pixelsRequired: false }),
        },
      );
    }),
  ),
  preview_act: McpToolAccess.actsAsCaller(({ action, ...input }, caller) =>
    Effect.gen(function* () {
      const decoded = yield* decodeActInput[action](input).pipe(
        Effect.mapError(
          (cause) =>
            new OrchestratorMcpFailure({ code: "invalid_request", message: cause.message }),
        ),
      );
      const timeoutMs = "timeoutMs" in decoded ? decoded.timeoutMs : undefined;
      if (action !== "upload" || !("paths" in decoded) || decoded.paths.length === 0) {
        return yield* invokeTabAction<object>(caller, action, action, decoded, timeoutMs);
      }

      yield* McpInvocationContext.requireThreadMcpCapability("preview");
      // actsAsCaller requires a live thread.
      const upload = yield* BrowserUploadPaths.resolve(caller.caller!, decoded.paths);
      const uploadInput = { ...decoded, paths: upload.files };
      const tabId = yield* authorizeTabAction(caller, "upload files", uploadInput, {
        approvalRequired: upload.needsApproval,
        files: upload.files,
      });
      return yield* invokeTargeted<object>("upload", { ...uploadInput, tabId }, timeoutMs);
    }),
  ),
  preview_evaluate: McpToolAccess.actsAsCaller(({ tabId, ...input }, caller) =>
    Effect.gen(function* () {
      const approvedTab = yield* authorizeTabAction(caller, "run JavaScript", { ...input, tabId });
      const { result, toolIcon } = yield* invoke<unknown>(
        "evaluate",
        input,
        undefined,
        approvedTab,
      );
      return { value: result ?? null, ...(toolIcon ? { toolIcon } : {}) };
    }),
  ),
  preview_wait_for: McpToolAccess.readsAsCaller((input) =>
    invokeTargeted<object>("waitFor", input, input.timeoutMs),
  ),
  preview_recording_start: McpToolAccess.actsAsCaller((input, caller) =>
    invokeTabAction<PreviewAutomationRecordingStatus>(
      caller,
      "recordingStart",
      "start recording the browser",
      input ?? {},
    ),
  ),
  preview_recording_stop: McpToolAccess.actsAsCaller((input) =>
    Effect.gen(function* () {
      const scope = yield* McpInvocationContext.requireThreadMcpCapability("preview");
      const { tabId, ...operationInput } = input;
      const response = yield* invoke<unknown>(
        "recordingStop",
        { ...operationInput, transferToEnvironment: true },
        PREVIEW_RECORDING_STOP_TIMEOUT_MS,
        tabId,
      );
      const artifact = yield* claimPreviewRecording(scope.thread.threadId, response.result);
      return { ...artifact, ...(response.toolIcon ? { toolIcon: response.toolIcon } : {}) };
    }),
  ),
} satisfies McpToolAccess.Handlers<typeof PreviewToolkit.tools>;

const { preview_snapshot, ...standardHandlers } = handlers;

export const layerStandard = McpToolAccess.toLayer(PreviewStandardToolkit, standardHandlers);

export const layerSnapshot = McpToolAccess.toLayer(PreviewSnapshotToolkit, {
  preview_snapshot,
});
