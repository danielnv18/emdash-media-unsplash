import type { UnsplashPhoto } from "../types.js";

export interface UnsplashPage {
  photos: UnsplashPhoto[];
  nextPage?: number;
}

export class UnsplashApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "UnsplashApiError";
  }
}

export class UnsplashClient {
  constructor(
    private readonly accessKey: () => string | undefined,
    private readonly request: typeof fetch = fetch,
  ) {}

  private async getJson<T>(url: URL): Promise<{ value: T; headers: Headers }> {
    const key = this.accessKey();
    if (!key) throw new Error("UNSPLASH_ACCESS_KEY is not configured on the server");
    // Workers fetch rejects the UnsplashClient instance as its `this` receiver.
    const response = await this.request.call(globalThis, url, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    });
    if (!response.ok) {
      const reason = response.status === 429 ? "Unsplash API quota reached" : `Unsplash API request failed (${response.status})`;
      throw new UnsplashApiError(response.status, reason);
    }
    return { value: await response.json() as T, headers: response.headers };
  }

  async listPhotos(page = 1, perPage = 24): Promise<UnsplashPage> {
    const url = new URL("https://api.unsplash.com/photos");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(30, Math.max(1, perPage))));
    const { value, headers } = await this.getJson<UnsplashPhoto[]>(url);
    return { photos: value, ...(headers.get("Link")?.includes('rel="next"') ? { nextPage: page + 1 } : {}) };
  }

  async searchPhotos(query: string, page = 1, perPage = 24): Promise<UnsplashPage> {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(Math.min(30, Math.max(1, perPage))));
    const { value } = await this.getJson<{ results: UnsplashPhoto[]; total_pages: number }>(url);
    return { photos: value.results, ...(page < value.total_pages ? { nextPage: page + 1 } : {}) };
  }

  async getPhoto(id: string): Promise<UnsplashPhoto | null> {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
    const url = new URL(`https://api.unsplash.com/photos/${id}`);
    try {
      return (await this.getJson<UnsplashPhoto>(url)).value;
    } catch (error) {
      if (error instanceof UnsplashApiError && error.status === 404) return null;
      throw error;
    }
  }

  async trackDownload(id: string, downloadLocation: string): Promise<void> {
    const url = new URL(downloadLocation);
    if (url.protocol !== "https:" || url.hostname !== "api.unsplash.com" || url.pathname !== `/photos/${encodeURIComponent(id)}/download`) {
      throw new Error("Invalid Unsplash download tracking URL");
    }
    await this.getJson<unknown>(url);
  }
}
