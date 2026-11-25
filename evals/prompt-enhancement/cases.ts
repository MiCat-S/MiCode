// Synthetic examples of the manual composer rewrite requirements.
export const cases = [
  {
    id: "same-language-with-references",
    draft: '用 $react 帮我看下 @"src/list state.ts" 滚动到底闪一下，只查安卓',
    recentConversation: [],
    customInstructions: "",
    rubric:
      "Keep Chinese, both exact references, the flashing at the bottom of the list, and the Android-only scope. Ask for investigation without adding a fix or a platform.",
  },
  {
    id: "context-does-not-add-scope",
    draft: "add a regression test for that, only for retry",
    recentConversation: [
      { role: "user", text: "The retry button sends the same request twice." },
      { role: "assistant", text: "We could fix retry and redesign the loading spinner." },
    ],
    customInstructions: "Use one concise sentence.",
    rubric:
      "Ask for one regression test covering the duplicate request when retrying. Preserve the retry-only scope and omit the spinner redesign.",
  },
  {
    id: "rewrite-a-question",
    draft: "what does the queued status mean here? i only need difference from waiting",
    recentConversation: [],
    customInstructions: "",
    rubric:
      "Keep a question about the difference between queued and waiting. Improve wording while withholding the answer and any unrelated status.",
  },
] as const;
