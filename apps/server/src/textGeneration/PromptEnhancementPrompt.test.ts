import { describe, expect, it } from "vite-plus/test";
import { buildPromptEnhancementPrompt } from "./PromptEnhancementPrompt.ts";

function maskedDraft(prompt: string): string {
  return JSON.parse(prompt.slice(prompt.lastIndexOf("\n\n") + 2)).draft;
}

describe("prompt enhancement references", () => {
  it("unwraps a model's duplicate output envelope before restoring references", () => {
    const { prompt, restore } = buildPromptEnhancementPrompt("Check @README.md please", [], "");
    const rewritten = maskedDraft(prompt).replace(
      " please",
      " for installation steps.\nKeep other sections intact.",
    );
    expect(restore(JSON.stringify({ text: rewritten }))).toBe(
      "Check @README.md for installation steps.\nKeep other sections intact.",
    );
    expect(restore('{"text":" "}')).toBe("");
  });

  it("keeps a JSON draft that already uses the output envelope's shape", () => {
    const original = '{"text": "check install steps"}';
    const rewritten = '{"text": "Check the installation steps."}';
    const { restore } = buildPromptEnhancementPrompt(original, [], "");
    expect(restore(rewritten)).toBe(rewritten);
  });

  it("round-trips literal mentions, skills, models, citations and context chips", () => {
    const references = [
      '@"src/hello world.ts"',
      "$impeccable",
      "model:codex/gpt-6.2-sol",
      "[Assistant quote](t3-citation://v1/a/b/c?text=quote&start=0&end=5&prefix=&suffix=)",
      "[Review](t3-context://v1/thread/thread-123)",
      "[file.ts](src/file.ts)",
    ].join(" ");
    const original = `整理一下 ${references}`;
    const { prompt, restore } = buildPromptEnhancementPrompt(original, [], "");
    const draft = maskedDraft(prompt);
    expect(draft).not.toContain("src/hello world.ts");
    expect(restore(draft.replace("整理一下", "请整理"))).toBe(`请整理 ${references}`);
  });

  it("rejects a missing, duplicated, joined, or newly invented reference", () => {
    const { prompt, restore } = buildPromptEnhancementPrompt("Inspect @README.md", [], "");
    const draft = maskedDraft(prompt);
    const marker = draft.slice("Inspect ".length);
    expect(restore("Inspect the file.")).toBeUndefined();
    expect(restore(`${draft} ${marker}`)).toBeUndefined();
    expect(restore(`Inspect${marker}`)).toBeUndefined();
    expect(restore(`${draft} @CHANGES.md`)).toBeUndefined();
  });

  it("leaves literal marker text and a TeX variable editable", () => {
    const draft = "Preserve [[T3_REF_0_0]] and \\( $skill + x \\) in @example";
    const { prompt, restore } = buildPromptEnhancementPrompt(draft, [], "");
    const masked = maskedDraft(prompt);
    expect(masked).toContain("[[T3_REF_0_0]] and \\( $skill + x \\)");
    expect(restore(masked)).toBe(draft);
  });
});
