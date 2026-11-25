import {
  DEFAULT_SERVER_SETTINGS,
  MAX_PROVIDER_SESSION_IDLE_TIMEOUT_MINUTES,
} from "@t3tools/contracts/settings";
import { T, useGT } from "gt-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useSettingsScope } from "./SettingsScopeContext";
import { SettingResetButton, SettingsRow } from "./settingsLayout";
import { useSearchableSetting } from "./settingsSearch";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

export function IdleSessionTimeoutSettingsRow() {
  const setting = useSearchableSetting();
  const gt = useGT();
  const { scope, connectedEnvironments } = useSettingsScope();
  const { providerSessionIdleTimeoutMinutes: minutes } = useScopedSettings();
  const mixed = useScopedSettingsMixed(["providerSessionIdleTimeoutMinutes"]);
  const updateSettings = useUpdateScopedSettings();
  const defaultMinutes = DEFAULT_SERVER_SETTINGS.providerSessionIdleTimeoutMinutes;
  const supported = connectedEnvironments.every(
    (environment) =>
      environment.serverConfig?.environment.capabilities.providerSessionIdleTimeoutSetting === true,
  );
  return (
    <SettingsRow
      {...setting("agent-session-idle-timeout")}
      serverScoped
      settingKeys={["providerSessionIdleTimeoutMinutes"]}
      description={gt(
        "Close resumable agent sessions after this many idle minutes. Applies the next time a session becomes idle.",
      )}
      status={supported ? undefined : gt("Update the selected environments to use this setting.")}
      resetAction={
        supported && (mixed || minutes !== defaultMinutes) ? (
          <SettingResetButton
            ariaLabel={gt("Reset idle session timeout to default")}
            onClick={() => updateSettings({ providerSessionIdleTimeoutMinutes: defaultMinutes })}
          />
        ) : null
      }
      control={
        <form
          key={JSON.stringify([scope.environmentIds, mixed ? null : minutes])}
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(event) => {
            event.preventDefault();
            const field = event.currentTarget.elements.namedItem("minutes") as HTMLInputElement;
            if (mixed || field.valueAsNumber !== minutes) {
              updateSettings({ providerSessionIdleTimeoutMinutes: field.valueAsNumber });
            }
          }}
        >
          <Input
            name="minutes"
            size="sm"
            type="number"
            min={1}
            max={MAX_PROVIDER_SESSION_IDLE_TIMEOUT_MINUTES}
            step={1}
            required
            defaultValue={mixed ? undefined : minutes}
            placeholder={mixed ? gt("Mixed") : undefined}
            aria-label={gt("Idle session timeout in minutes")}
            disabled={!supported}
            className="w-full sm:w-24"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!supported}>
            <T>Save</T>
          </Button>
        </form>
      }
    />
  );
}
