import type { MediaProviderItem } from "emdash/media";
import type { UnsplashPhoto, UnsplashMetadata } from "../types.js";
import { addUnsplashAttribution, attributionFor } from "../utils/attribution.js";

function filenameFor(photo: UnsplashPhoto): string {
  const stem = (photo.alt_description || photo.description || photo.id)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || photo.id;
  return `${stem}.jpg`;
}

export function mapUnsplashPhoto(photo: UnsplashPhoto, utmSource: string): MediaProviderItem {
  const meta: UnsplashMetadata = {
    source: "unsplash",
    photographer: {
      name: photo.user.name,
      username: photo.user.username,
      profileUrl: addUnsplashAttribution(photo.user.links.html, utmSource),
    },
    photoUrl: addUnsplashAttribution(photo.links.html, utmSource),
    downloadLocation: photo.links.download_location,
    urls: photo.urls,
    attribution: attributionFor(photo, utmSource),
  };
  return {
    id: photo.id,
    filename: filenameFor(photo),
    mimeType: "image/jpeg",
    width: photo.width,
    height: photo.height,
    alt: photo.alt_description || photo.description || "",
    previewUrl: photo.urls.small,
    ...(photo.blur_hash ? { blurhash: photo.blur_hash } : {}),
    ...(photo.color ? { dominantColor: photo.color } : {}),
    meta: meta as unknown as Record<string, unknown>,
  };
}
