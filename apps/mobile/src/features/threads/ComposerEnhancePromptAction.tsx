import { useGT } from "gt-react-native";

import { VoiceActionButton } from "../voice-input/ComposerDictationControl";
import type { PromptEnhancementState } from "./usePromptEnhancement";

export function ComposerEnhancePromptAction(props: {
  readonly size?: "regular" | "large";
  readonly state: PromptEnhancementState;
  readonly canEnhance: boolean;
  readonly onToggle: () => void;
}) {
  const gt = useGT();
  return (
    <VoiceActionButton
      size={props.size}
      accessibilityLabel={
        props.state === "enhancing"
          ? gt("Cancel prompt enhancement")
          : props.state === "enhanced"
            ? gt("Undo prompt enhancement")
            : gt("Enhance prompt")
      }
      disabled={props.state === "idle" && !props.canEnhance}
      loading={props.state === "enhancing"}
      icon={props.state === "enhanced" ? "arrow.uturn.backward" : "text.enhance"}
      onPress={props.onToggle}
    />
  );
}
