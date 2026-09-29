import type { MediaProviderDescriptor } from "emdash/media";
import type { UnsplashConfig } from "./types.js";

export type { UnsplashConfig, UnsplashMetadata, UnsplashPhoto } from "./types.js";
export { UnsplashClient, UnsplashApiError } from "./api/client.js";
export { mapUnsplashPhoto } from "./mapping/unsplash-to-emdash.js";
export { addUnsplashAttribution, attributionFor } from "./utils/attribution.js";
export { unsplashImageUrl } from "./utils/urls.js";

export function unsplash(config: UnsplashConfig): MediaProviderDescriptor<UnsplashConfig> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(config.utmSource)) {
    throw new Error("utmSource must contain letters, numbers, underscores, or hyphens");
  }
  return {
    id: "unsplash",
    name: "Unsplash",
    entrypoint: "emdash-media-unsplash/runtime",
    capabilities: { browse: true, search: true, upload: false, delete: false },
    config: { accessKeyEnvVar: config.accessKeyEnvVar || "UNSPLASH_ACCESS_KEY", utmSource: config.utmSource, defaultWidth: config.defaultWidth },
  };
}
