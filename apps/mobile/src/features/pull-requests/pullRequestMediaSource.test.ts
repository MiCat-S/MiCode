import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId } from "@t3tools/contracts";
import { filePreviewGallery } from "../../lib/filePreviewGallery";
import { needsRemoteMediaConsent, pullRequestImageSource } from "./pullRequestMediaSource";

const location = {
  environmentId: EnvironmentId.make("test"),
  cwd: "/repo",
  repository: "enterprise/private",
};
const url = "https://github.com/user-attachments/assets/abc-123";

describe("PR media previews", () => {
  it("loads forge and local media right away but asks before other hosts", () => {
    expect(needsRemoteMediaConsent(url)).toBe(false);
    expect(needsRemoteMediaConsent("http://192.168.1.20/shot.png")).toBe(false);
    expect(needsRemoteMediaConsent("https://tracker.example.com/pixel.png")).toBe(true);
  });

  it("keeps every gallery image resolvable and the tapped image appears only once", () => {
    const first = pullRequestImageSource(url, location);
    const second = pullRequestImageSource(`${url}-second`, location);
    const selected = { ...second, sourceIdentifier: "tapped" };
    const gallery = filePreviewGallery(selected, [first, second]);
    expect(gallery).toEqual([first, selected]);
    expect(gallery).toMatchObject([
      { resource: { url, repository: location.repository } },
      { resource: { url: `${url}-second`, repository: location.repository } },
    ]);
  });
});
