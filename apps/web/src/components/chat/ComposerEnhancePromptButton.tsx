import { useGT } from "gt-react";
import { Undo2Icon } from "lucide-react";
import type { PointerEvent, SVGProps } from "react";

import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import type { PromptEnhancementState } from "./usePromptEnhancement";

const keepFocus = (event: PointerEvent) => event.preventDefault();

const SPARKLE =
  "M17.5 1.5C17.9 4.6 19.4 6.1 22.5 6.5 19.4 6.9 17.9 8.4 17.5 11.5 17.1 8.4 15.6 6.9 12.5 6.5 15.6 6.1 17.1 4.6 17.5 1.5Z";

/** Lines of text with a sparkle, drawn on Lucide's grid so it sits with the other composer icons. */
export function PromptEnhanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M3 6h5" />
      <path d="M3 12h8" />
      <path d="M3 18h18" />
      <path d={SPARKLE} fill="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function ComposerEnhancePromptButton(props: {
  state: PromptEnhancementState;
  canEnhance: boolean;
  shortcutLabel: string | null;
  onToggle(): void;
}) {
  const gt = useGT();
  const label =
    props.state === "enhancing"
      ? gt("Cancel prompt enhancement")
      : props.state === "enhanced"
        ? gt("Undo prompt enhancement")
        : gt("Enhance prompt");
  const shortcut = props.state === "enhancing" ? "Esc" : props.shortcutLabel;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={label}
            disabled={props.state === "idle" && !props.canEnhance}
            onPointerDown={keepFocus}
            onClick={props.onToggle}
            className="shrink-0"
          >
            {props.state === "enhancing" ? (
              <Spinner aria-hidden size="sm" />
            ) : props.state === "enhanced" ? (
              <Undo2Icon />
            ) : (
              <PromptEnhanceIcon />
            )}
          </Button>
        }
      />
      <TooltipPopup side="top">
        {label}
        {shortcut ? ` (${shortcut})` : ""}
      </TooltipPopup>
    </Tooltip>
  );
}
