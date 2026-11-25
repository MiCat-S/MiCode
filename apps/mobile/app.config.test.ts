import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

// Keep config parsing independent of local env files and build credentials.
vi.mock("../../scripts/lib/public-config.ts", () => ({
  loadRepoEnv: () => ({
    APP_VARIANT: process.env.APP_VARIANT,
    T3CODE_EAS_PROJECT_ID: process.env.T3CODE_EAS_PROJECT_ID,
    T3CODE_HOSTED_APP_URL: process.env.T3CODE_HOSTED_APP_URL,
    T3CODE_MOBILE_UPDATES_ENABLED: process.env.T3CODE_MOBILE_UPDATES_ENABLED,
  }),
}));

beforeEach(() => {
  vi.stubEnv("T3CODE_HOSTED_APP_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadConfig(variant: string | undefined) {
  vi.resetModules();
  vi.stubEnv("APP_VARIANT", variant);
  return (await import("./app.config.ts")).default;
}

it.each(["prod", ""])("rejects APP_VARIANT=%j before selecting production IDs", async (value) => {
  await expect(loadConfig(value)).rejects.toThrow(
    "APP_VARIANT must be development, preview, or production.",
  );
});

it.each([
  [undefined, false],
  ["0", false],
  ["1", true],
])("only enables mobile updates with an explicit opt-in (%j)", async (value, enabled) => {
  vi.stubEnv("T3CODE_MOBILE_UPDATES_ENABLED", value);
  vi.stubEnv("T3CODE_EAS_PROJECT_ID", enabled ? "mi-code-project" : undefined);
  const config = await loadConfig("production");
  expect(config.updates?.enabled).toBe(enabled);
  expect(config.updates?.url).toBe(enabled ? "https://u.expo.dev/mi-code-project" : undefined);
});

it("requires a project ID before enabling mobile updates", async () => {
  vi.stubEnv("T3CODE_MOBILE_UPDATES_ENABLED", "1");
  vi.stubEnv("T3CODE_EAS_PROJECT_ID", undefined);
  await expect(loadConfig("production")).rejects.toThrow("Set T3CODE_EAS_PROJECT_ID");
});

it.each([
  [undefined, "io.github.micats.micode"],
  ["development", "io.github.micats.micode.dev"],
  ["preview", "io.github.micats.micode.preview"],
  ["production", "io.github.micats.micode"],
])("keeps the iOS and Android identifiers for APP_VARIANT=%j", async (value, identifier) => {
  const config = await loadConfig(value);
  expect(config.ios?.bundleIdentifier).toBe(identifier);
  expect(config.android?.package).toBe(identifier);
  expect(config.ios?.appleTeamId).toBeUndefined();
});

it("claims links only for the configured hosted app", async () => {
  const host = "micode.example.test";
  vi.stubEnv("T3CODE_HOSTED_APP_URL", `https://${host}`);
  const config = await loadConfig("production");
  expect(config.ios?.associatedDomains).toEqual([`applinks:${host}`]);
  expect(config.android?.intentFilters?.[0]?.data).toEqual([
    { scheme: "https", host, pathPrefix: "/threads/" },
  ]);
});
