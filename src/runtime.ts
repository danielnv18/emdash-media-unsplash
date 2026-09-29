import { getSecret } from "astro:env/server";
import type { MediaProvider, MediaValue } from "emdash/media";
import { UnsplashClient } from "./api/client.js";
import { mapUnsplashPhoto } from "./mapping/unsplash-to-emdash.js";
import type { UnsplashConfig, UnsplashMetadata } from "./types.js";
import { isUnsplashImageUrl, unsplashImageUrl } from "./utils/urls.js";

function metadata(value: MediaValue): UnsplashMetadata | null {
  const meta = value.meta as unknown as UnsplashMetadata | undefined;
  return meta?.source === "unsplash" && isUnsplashImageUrl(meta.urls?.raw) ? meta : null;
}

export function createMediaProvider(config: UnsplashConfig): MediaProvider {
  const client = new UnsplashClient(() => getSecret(config.accessKeyEnvVar || "UNSPLASH_ACCESS_KEY"));
  return {
    async list({ cursor, limit, query, mimeType }) {
      if (mimeType && !mimeType.startsWith("image/")) return { items: [] };
      const page = cursor && /^[1-9]\d*$/.test(cursor) ? Number(cursor) : 1;
      const boundedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
      const pageSize = Math.min(30, Math.max(1, limit || 24));
      const result = query?.trim()
        ? await client.searchPhotos(query.trim(), boundedPage, pageSize)
        : await client.listPhotos(boundedPage, pageSize);
      return {
        items: result.photos.map((photo) => mapUnsplashPhoto(photo, config.utmSource)),
        ...(result.nextPage ? { nextCursor: String(result.nextPage) } : {}),
      };
    },
    async get(id) {
      const photo = await client.getPhoto(id);
      return photo ? mapUnsplashPhoto(photo, config.utmSource) : null;
    },
    getEmbed(value, options) {
      const meta = metadata(value);
      if (!meta) throw new Error(`Unsplash image ${value.id} has no usable source metadata`);
      const maxWidth = value.width && value.width > 0 ? value.width : 1920;
      const initialWidth = Math.min(maxWidth, options?.width || config.defaultWidth || 1200);
      return {
        type: "image" as const,
        src: unsplashImageUrl(meta.urls.raw, initialWidth),
        width: value.width,
        height: value.height,
        alt: value.alt,
        getSrc: ({ width, height }) => unsplashImageUrl(meta.urls.raw, Math.min(maxWidth, width || initialWidth), height),
      };
    },
  };
}
