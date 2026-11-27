import { expect, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ProjectId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";

import * as ProjectService from "../project/ProjectService.ts";
import * as BrowserUploadPaths from "./BrowserUploadPaths.ts";

it.effect("limits automatic uploads to regular files in the current checkout", () =>
  Effect.scoped(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fs.makeTempDirectoryScoped();
      const worktreePath = path.join(root, "worktree");
      const outside = path.join(root, "outside.txt");
      const inside = path.join(worktreePath, "inside.txt");
      const symlink = path.join(worktreePath, "symlink.txt");
      yield* fs.makeDirectory(worktreePath);
      yield* fs.writeFileString(inside, "inside");
      yield* fs.writeFileString(outside, "outside");
      yield* fs.symlink(outside, symlink);
      const thread = { worktreePath, projectId: ProjectId.make("project") };
      const canonicalInside = yield* fs.realPath(inside);
      const canonicalOutside = yield* fs.realPath(outside);

      expect(yield* BrowserUploadPaths.resolve(thread, [inside])).toEqual({
        files: [canonicalInside],
        needsApproval: false,
      });
      expect(yield* BrowserUploadPaths.resolve(thread, [symlink])).toEqual({
        files: [canonicalOutside],
        needsApproval: true,
      });
      expect(
        yield* BrowserUploadPaths.resolve(thread, [outside]).pipe(
          Effect.map((r) => r.needsApproval),
        ),
      ).toBe(true);
      expect(
        yield* BrowserUploadPaths.resolve(thread, [worktreePath]).pipe(Effect.flip),
      ).toMatchObject({
        code: "invalid_request",
      });
    }),
  ).pipe(
    Effect.provide(
      Layer.mergeAll(NodeServices.layer, Layer.mock(ProjectService.ProjectService)({})),
    ),
  ),
);
