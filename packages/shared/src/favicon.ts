import type { ToolActivityIcon } from "@t3tools/contracts";

// A remote icon URL tells its host which page or tool the agent used, so only inline images load.
function inlineImageUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl || rawUrl.length > 4096) return null;
  try {
    return new URL(rawUrl).protocol === "data:" ? rawUrl : null;
  } catch {
    return null;
  }
}

export function toolActivityIconUrl(
  icon: Exclude<ToolActivityIcon, { readonly _tag: "native-app" }>,
  appearance: "light" | "dark",
): string | null {
  const [light, dark] =
    icon._tag === "website"
      ? [icon.faviconUrl, icon.faviconUrlDark]
      : [icon.logoUrl, icon.logoUrlDark];
  return (appearance === "dark" ? inlineImageUrl(dark) : null) ?? inlineImageUrl(light);
}
