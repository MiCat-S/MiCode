import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";

import "../../index.css";
import type { ScopedSettingsPatch } from "./scopedSettings";

const state = vi.hoisted(() => ({
  supported: true,
  update: vi.fn<(patch: ScopedSettingsPatch) => void>(),
}));

vi.mock(import("./SettingsScopeContext"), async (original) => ({
  ...(await original()),
  useSettingsScope: (() => ({
    scope: { environmentIds: ["local"] },
    connectedEnvironments: [
      {
        serverConfig: {
          environment: { capabilities: { providerSessionIdleTimeoutSetting: state.supported } },
        },
      },
    ],
  })) as never,
}));
vi.mock(import("./useScopedSettings"), async (original) => ({
  ...(await original()),
  useScopedSettings: (() => DEFAULT_UNIFIED_SETTINGS) as never,
  useScopedSettingsMixed: () => false,
  useUpdateScopedSettings: () => state.update,
}));
vi.mock(import("./settingsLayout"), async (original) => ({
  ...(await original()),
  SettingsRow: ({ title, status, control }) => (
    <section>
      <h2>{title}</h2>
      {status && <p>{status}</p>}
      {control}
    </section>
  ),
}));

import { IdleSessionTimeoutSettingsRow } from "./IdleSessionTimeoutSettingsRow";

it("shows 30 minutes, rejects invalid durations, and saves an edited value", async () => {
  state.supported = true;
  state.update.mockClear();
  await using screen = await render(<IdleSessionTimeoutSettingsRow />, { router: false });
  const input = screen.getByRole("spinbutton", { name: "Idle session timeout in minutes" });
  const save = screen.getByRole("button", { name: "Save" });

  await expect.element(input).toHaveValue(30);
  await input.fill("0");
  await save.click();
  expect(state.update).not.toHaveBeenCalled();
  await input.fill("45");
  await save.click();
  expect(state.update).toHaveBeenCalledWith({ providerSessionIdleTimeoutMinutes: 45 });
});

it("prevents saving to an older server without the setting", async () => {
  state.supported = false;
  await using screen = await render(<IdleSessionTimeoutSettingsRow />, { router: false });
  await expect.element(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  await expect
    .element(screen.getByText("Update the selected environments to use this setting."))
    .toBeVisible();
});
