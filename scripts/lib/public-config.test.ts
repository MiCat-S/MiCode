// @effect-diagnostics nodeBuiltinImport:off - Tests exercise root env file precedence directly.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { loadRepoEnv } from "./public-config.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    NodeFS.rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadRepoEnv", () => {
  it("preserves direct settings but strips legacy cloud values from every input", () => {
    const repoRoot = makeTemporaryDirectory();
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env"),
      "T3CODE_APPLE_TEAM_ID=ROOT\nT3CODE_RELAY_URL=https://relay.example.test\n",
    );
    NodeFS.writeFileSync(
      NodePath.join(repoRoot, ".env.local"),
      "T3CODE_APPLE_TEAM_ID=LOCAL\nEXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_local\n",
    );
    const env = loadRepoEnv({
      baseEnv: {
        T3CODE_APPLE_TEAM_ID: "SHELL",
        VITE_T3CODE_RELAY_URL: "https://relay.example.test",
      },
      repoRoot,
    });
    expect(env).toEqual({ T3CODE_APPLE_TEAM_ID: "SHELL" });
  });
});

function makeTemporaryDirectory() {
  const directory = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3code-public-config-"));
  temporaryDirectories.push(directory);
  return directory;
}
