import { DEFAULT_PROMPT_ENHANCEMENT_PROMPT } from "@t3tools/contracts";
import { resolvePromptEnhancementModelSelection } from "@t3tools/shared/serverSettings";
import { T, useGT } from "gt-react";
import { useRef } from "react";

import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { DedicatedTextGenerationModelRow } from "./DedicatedTextGenerationModelRow";
import { SettingsRow, SettingsSection } from "./settingsLayout";
import { useSettingsScope } from "./SettingsScopeContext";
import { useSearchableSetting } from "./settingsSearch";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useUpdateScopedSettings,
} from "./useScopedSettings";

/** The composer's enhance button rewrites a draft with these instructions and model. */
export function PromptEnhancementSettingsSection() {
  const gt = useGT();
  const setting = useSearchableSetting();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const { targets } = useSettingsScope();
  const mixed = useScopedSettingsMixed(["promptEnhancementPrompt"]);
  const edited = useRef(false);
  const prompt = settings.promptEnhancementPrompt;
  const scopeKey = targets.map((target) => `${target.environmentId}:${target.projectId}`).join(",");

  return (
    <SettingsSection id="prompt-enhancement" title={gt("Prompt enhancement")}>
      <SettingsRow
        serverScoped
        settingKeys={["promptEnhancementPrompt"]}
        {...setting("prompt-enhancement-instructions")}
        title={gt("Instructions")}
        description={
          mixed
            ? gt("The selected targets use different instructions.")
            : prompt.mode === "custom"
              ? gt("Your own instructions for rewriting drafts.")
              : gt(
                  "Rewrites the draft into a clearer, more direct prompt, keeping its language, meaning, and requirements.",
                )
        }
        control={
          <Select
            value={mixed ? null : prompt.mode}
            onValueChange={(value) => {
              if (value !== "default" && value !== "custom") return;
              updateSettings({
                promptEnhancementPrompt: {
                  mode: value,
                  customInstructions:
                    value === "custom" && !prompt.customInstructions.trim()
                      ? DEFAULT_PROMPT_ENHANCEMENT_PROMPT
                      : prompt.customInstructions,
                },
              });
            }}
          >
            <SelectTrigger size="sm" aria-label={gt("Prompt enhancement instructions")}>
              <SelectValue>
                {(value: "default" | "custom" | null) =>
                  value === null ? gt("Mixed") : value === "custom" ? gt("Custom") : gt("Built-in")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectPopup align="end" alignItemWithTrigger={false}>
              <SelectItem value="default">
                <T>Built-in</T>
              </SelectItem>
              <SelectItem value="custom">
                <T>Custom</T>
              </SelectItem>
            </SelectPopup>
          </Select>
        }
      >
        {!mixed && prompt.mode === "custom" ? (
          <div className="mt-3 max-w-2xl pb-3.5">
            <Textarea
              key={`${scopeKey}:${prompt.customInstructions}`}
              aria-label={gt("Custom prompt enhancement instructions")}
              maxLength={10_000}
              rows={5}
              defaultValue={prompt.customInstructions}
              placeholder={DEFAULT_PROMPT_ENHANCEMENT_PROMPT}
              onChange={() => {
                edited.current = true;
              }}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (edited.current && value !== prompt.customInstructions)
                  updateSettings({
                    promptEnhancementPrompt: { mode: "custom", customInstructions: value },
                  });
                edited.current = false;
              }}
            />
          </div>
        ) : null}
      </SettingsRow>
      <DedicatedTextGenerationModelRow
        settingKey="promptEnhancementModelSelection"
        searchId="prompt-enhancement-model"
        resolveSelection={resolvePromptEnhancementModelSelection}
        title={gt("Enhancement model")}
        description={gt(
          "Model that rewrites drafts, such as a faster one. When disabled, use the text generation model configured for this environment.",
        )}
        switchLabel={gt("Use a separate enhancement model")}
        notSavedTitle={gt("Enhancement model not saved")}
      />
    </SettingsSection>
  );
}
