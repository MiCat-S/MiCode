import { OrchestratorMcpFailure, type OrchestrationV2ThreadShell } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import * as ProjectService from "../project/ProjectService.ts";
import { isWithinRoot } from "../workspace/KnownWorkspaces.ts";

const invalidFile = () =>
  new OrchestratorMcpFailure({
    code: "invalid_request",
    message: "Browser uploads require absolute paths to existing regular files.",
  });

export const resolve = Effect.fn("BrowserUploadPaths.resolve")(function* (
  thread: Pick<OrchestrationV2ThreadShell, "worktreePath" | "projectId">,
  paths: ReadonlyArray<string>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const projects = yield* ProjectService.ProjectService;
  const workspace =
    thread.worktreePath ??
    (yield* projects.getById(thread.projectId).pipe(
      Effect.mapError(
        () =>
          new OrchestratorMcpFailure({
            code: "orchestration_error",
            message: "Could not read the project's workspace for this upload.",
          }),
      ),
      Effect.flatMap(
        Option.match({
          onNone: () =>
            Effect.fail(
              new OrchestratorMcpFailure({
                code: "invalid_request",
                message: "The project for this browser upload no longer exists.",
              }),
            ),
          onSome: (project) => Effect.succeed(project.workspaceRoot),
        }),
      ),
    ));
  const root = yield* fs.realPath(workspace).pipe(
    Effect.mapError(
      () =>
        new OrchestratorMcpFailure({
          code: "invalid_request",
          message: "Could not resolve the project's workspace for this upload.",
        }),
    ),
  );
  const files = yield* Effect.forEach(paths, (input) =>
    Effect.gen(function* () {
      if (!path.isAbsolute(input)) return yield* invalidFile();
      const canonical = yield* fs.realPath(input).pipe(Effect.mapError(invalidFile));
      const stat = yield* fs.stat(canonical).pipe(Effect.mapError(invalidFile));
      if (stat.type !== "File") return yield* invalidFile();
      return canonical;
    }),
  );
  return { files, needsApproval: files.some((file) => !isWithinRoot(path, file, root)) };
});
