/** Prompt text naming a provider instance and model for the agent. No `@`, which the editor would turn into a file chip. */
export function formatComposerModelMention(instanceId: string, model: string): string {
  return `model:${instanceId}/${model}`;
}

export interface ComposerModelMentionOccurrence {
  readonly instanceId: string;
  readonly model: string;
  readonly source: string;
  readonly start: number;
  readonly end: number;
}

// Instance ids match ProviderInstanceId; model slugs may contain `/`, as in `opencode/anthropic/opus`.
const MODEL_MENTION_PATTERN = /(?<![^\s,(["'])model:([a-zA-Z][a-zA-Z0-9_-]*)\/([^\s,"']+)/gu;
const SENTENCE_PUNCTUATION = ".;:!?";
const CLOSING_BRACKETS: Readonly<Record<string, string>> = { ")": "(", "]": "[" };

function countOf(text: string, char: string): number {
  return text.split(char).length - 1;
}

// Slugs like `foo(bar)` or `GPT-6.1-Sol[1m]` keep balanced brackets; prose wrapping them does not.
function trimModelSlug(slug: string): string {
  let end = slug.length;
  const unmatched = new Map<string, number>();
  while (end > 0) {
    const last = slug[end - 1]!;
    if (SENTENCE_PUNCTUATION.includes(last)) {
      end -= 1;
      continue;
    }
    const opening = CLOSING_BRACKETS[last];
    if (opening === undefined) break;
    const excess = unmatched.get(last) ?? countOf(slug, last) - countOf(slug, opening);
    if (excess <= 0) break;
    unmatched.set(last, excess - 1);
    end -= 1;
  }
  return slug.slice(0, end);
}

/** Finds the `model:<instance>/<model>` references that `formatComposerModelMention` writes. */
export function collectComposerModelMentions(
  text: string,
): ReadonlyArray<ComposerModelMentionOccurrence> {
  if (!text.includes("model:")) return [];
  const occurrences: ComposerModelMentionOccurrence[] = [];
  for (const match of text.matchAll(MODEL_MENTION_PATTERN)) {
    const instanceId = match[1]!;
    const model = trimModelSlug(match[2]!);
    if (model.length === 0) continue;
    const start = match.index;
    const end = start + "model:".length + instanceId.length + 1 + model.length;
    occurrences.push({ instanceId, model, source: text.slice(start, end), start, end });
  }
  return occurrences;
}
