import { describe, expect, it } from "@effect/vitest";

import { toolActivityIconUrl } from "./favicon.ts";

const lightIcon = "data:image/png;base64,bGlnaHQ=";
const darkIcon = "data:image/png;base64,ZGFyaw==";

describe("toolActivityIconUrl", () => {
  it("never returns a URL that would load an icon from another host", () => {
    const icons = [
      { _tag: "website", pageUrl: "https://example.com/docs/page?q=1" },
      { _tag: "website", pageUrl: "http://192.168.1.10:8080/admin" },
      { _tag: "website", pageUrl: "https://github.com/pingdotgg/t3code" },
      {
        _tag: "website",
        pageUrl: "https://example.com/docs",
        faviconUrl: "https://example.com/icon.png",
        faviconUrlDark: "http://localhost:5173/icon-dark.png",
      },
      { _tag: "themed-logo", logoUrl: "https://www.google.com/s2/favicons?domain=firecrawl.dev" },
      {
        _tag: "themed-logo",
        logoUrl: "https://example.com/logo.png",
        logoUrlDark: "chrome-extension://example/logo.png",
      },
    ] as const;
    for (const icon of icons) {
      for (const appearance of ["light", "dark"] as const) {
        expect(toolActivityIconUrl(icon, appearance), `${icon._tag} ${appearance}`).toBeNull();
      }
    }
  });

  it("uses inline images for the requested appearance", () => {
    const website = {
      _tag: "website",
      pageUrl: "https://example.com",
      faviconUrl: lightIcon,
      faviconUrlDark: darkIcon,
    } as const;
    expect(toolActivityIconUrl(website, "light")).toBe(lightIcon);
    expect(toolActivityIconUrl(website, "dark")).toBe(darkIcon);
    const logo = {
      _tag: "themed-logo",
      logoUrl: lightIcon,
      logoUrlDark: "https://example.com/logo-dark.png",
    } as const;
    expect(toolActivityIconUrl(logo, "light")).toBe(lightIcon);
    expect(toolActivityIconUrl(logo, "dark")).toBe(lightIcon);
  });
});
