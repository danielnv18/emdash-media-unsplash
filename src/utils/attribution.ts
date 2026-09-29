import type { UnsplashPhoto, UnsplashMetadata } from "../types.js";

export function addUnsplashAttribution(url: string, source: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !["unsplash.com", "www.unsplash.com"].includes(parsed.hostname)) {
    throw new Error("Expected an Unsplash HTTPS attribution URL");
  }
  parsed.searchParams.set("utm_source", source);
  parsed.searchParams.set("utm_medium", "referral");
  return parsed.toString();
}

export function attributionFor(photo: UnsplashPhoto, source: string): UnsplashMetadata["attribution"] {
  return {
    creatorName: photo.user.name,
    creatorUrl: addUnsplashAttribution(photo.user.links.html, source),
    sourceName: "Unsplash",
    sourceUrl: addUnsplashAttribution("https://unsplash.com/", source),
  };
}
