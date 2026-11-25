import { afterEach, expect, it, vi } from "vite-plus/test";

const { configure, dispatchEvents, loadPreferences } = vi.hoisted(() => ({
  configure: vi.fn(),
  dispatchEvents: vi.fn(async () => undefined),
  loadPreferences: vi.fn(),
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: { extra: { relay: { url: "https://relay.invalid" } } } },
}));
vi.mock("expo-observe", () => ({ Observe: { configure, dispatchEvents } }));
vi.mock("../../persistence/imperative", () => ({ loadPreferences }));

afterEach(() => vi.unstubAllGlobals());

it.each([
  {},
  { crashReportsEnabled: false, connectionTracesEnabled: false },
  { crashReportsEnabled: true },
  { connectionTracesEnabled: true },
])("enables only explicitly opted-in mobile diagnostics for %j", async (saved) => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal("__DEV__", false);
  loadPreferences.mockResolvedValue(saved);

  const { connectionTracesEnabled } = await import("./diagnosticsSetting");
  await import("./observe");
  await vi.dynamicImportSettled();

  const crashReportsEnabled = saved.crashReportsEnabled === true;
  expect(connectionTracesEnabled()).toBe(saved.connectionTracesEnabled === true);
  expect(configure).toHaveBeenCalledExactlyOnceWith({ dispatchingEnabled: crashReportsEnabled });
  expect(dispatchEvents).toHaveBeenCalledTimes(Number(crashReportsEnabled));
});
