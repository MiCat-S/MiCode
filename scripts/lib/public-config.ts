// @effect-diagnostics nodeBuiltinImport:off - Build bootstrap reads optional root env files before an Effect runtime exists.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";
import * as NodeUtil from "node:util";

type Environment = Readonly<Record<string, string | undefined>>;

const REPO_ROOT = NodePath.resolve(NodeURL.fileURLToPath(import.meta.url), "../../..");

export function loadRepoEnv({
  baseEnv = process.env,
  repoRoot = REPO_ROOT,
}: {
  readonly baseEnv?: Environment;
  readonly repoRoot?: string;
} = {}): Record<string, string | undefined> {
  const rootEnv = readEnvFile(NodePath.join(repoRoot, ".env"));
  const localEnv = readEnvFile(NodePath.join(repoRoot, ".env.local"));
  const env = { ...rootEnv, ...localEnv, ...baseEnv };
  for (const key of Object.keys(env)) {
    if (
      /^(?:T3CODE_(?:CLERK|RELAY|MOBILE_OTLP_TRACES)|VITE_(?:CLERK|T3CODE_RELAY|RELAY_OTLP_TRACES)|EXPO_PUBLIC_(?:CLERK|OTLP_TRACES))_/.test(
        key,
      )
    ) {
      delete env[key];
    }
  }
  return env;
}

function readEnvFile(path: string): Record<string, string | undefined> {
  return NodeFS.existsSync(path) ? NodeUtil.parseEnv(NodeFS.readFileSync(path, "utf8")) : {};
}
