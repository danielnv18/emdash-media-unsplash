const IMAGE_HOST = "images.unsplash.com";

export function unsplashImageUrl(rawUrl: string, width: number, height?: number): string {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== IMAGE_HOST || !url.searchParams.has("ixid")) {
    throw new Error("Expected an Unsplash image URL with ixid");
  }
  url.searchParams.set("w", String(Math.max(1, Math.floor(width))));
  if (height && Number.isFinite(height) && height > 0) url.searchParams.set("h", String(Math.floor(height)));
  url.searchParams.set("fit", "max");
  url.searchParams.set("auto", "format");
  url.searchParams.set("q", "80");
  return url.toString();
}

export function isUnsplashImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === IMAGE_HOST && url.searchParams.has("ixid");
  } catch {
    return false;
  }
}
