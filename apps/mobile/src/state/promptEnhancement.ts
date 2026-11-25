import { createPromptEnhancementCommands } from "@t3tools/client-runtime/state/promptEnhancement";

import { connectionAtomRuntime } from "../connection/runtime";

export const promptEnhancement = createPromptEnhancementCommands(connectionAtomRuntime);
