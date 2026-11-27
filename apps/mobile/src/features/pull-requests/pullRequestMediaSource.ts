import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import { isRemoteMarkdownMediaUri } from "@t3tools/shared/markdownLinks";
import { SOURCE_CONTROL_MEDIA_ASSET, type EnvironmentId } from "@t3tools/contracts";
import type { FilePreviewItem } from "../../components/ui/FilePreviewModal.types";

export interface PullRequestMediaLocation {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly repository?: string;
}

/** Keep the original resource identity so previewers can resolve and renew its capability. */
export function pullRequestMediaSource(url: string, location: PullRequestMediaLocation | null) {
  const fetchUrl = sourceControlClients.mediaUrl(url)?.fetchUrl;
  return location && fetchUrl
    ? {
        environmentId: location.environmentId,
        resource: {
          _tag: SOURCE_CONTROL_MEDIA_ASSET,
          cwd: location.cwd,
          url: fetchUrl,
          ...(location.repository ? { repository: location.repository } : {}),
        },
      }
    : { uri: url };
}

export function pullRequestImageSource(
  url: string,
  location: PullRequestMediaLocation | null,
): FilePreviewItem {
  return { kind: "image", ...pullRequestMediaSource(url, location) };
}

/** Forge media goes through the environment; anything else waits for the user to load it. */
export function needsRemoteMediaConsent(url: string): boolean {
  return !sourceControlClients.mediaUrl(url)?.fetchUrl && isRemoteMarkdownMediaUri(url);
}
