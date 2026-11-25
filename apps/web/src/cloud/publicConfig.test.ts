import { expect, it, vi } from "vite-plus/test";
import { hasCloudPublicConfig, resolveCloudPublicConfig } from "./publicConfig";

it("ignores the former login and relay variables", () => {
  vi.stubEnv("VITE_CLERK_PUBLISHABLE_KEY", "pk_test_example");
  vi.stubEnv("VITE_CLERK_JWT_TEMPLATE", "t3-relay");
  vi.stubEnv("VITE_T3CODE_RELAY_URL", "https://relay.example.test");
  try {
    expect(hasCloudPublicConfig()).toBe(false);
    expect(resolveCloudPublicConfig()).toMatchObject({ clerkPublishableKey: null, relayUrl: null });
  } finally {
    vi.unstubAllEnvs();
  }
});
