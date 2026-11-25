import { WS_METHODS } from "@t3tools/contracts";
import type { Atom } from "effect/reactivity";

import type { EnvironmentRegistry } from "../connection/registry.ts";
import { createEnvironmentRpcCommand } from "./runtime.ts";

export function createPromptEnhancementCommands<R, E>(
  runtime: Atom.AtomRuntime<EnvironmentRegistry | R, E>,
) {
  return {
    enhance: createEnvironmentRpcCommand(runtime, {
      label: "environment-data:prompt-enhancement:enhance",
      tag: WS_METHODS.promptEnhancementEnhance,
    }),
  };
}
