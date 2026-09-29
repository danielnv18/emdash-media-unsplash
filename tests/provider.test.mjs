import assert from "node:assert/strict";
import { test } from "node:test";
import { UnsplashClient, mapUnsplashPhoto, unsplash } from "../dist/index.js";

const photo = {
  id: "abc123", width: 4000, height: 2667, description: "A church", alt_description: "Stone church building",
  urls: {
    raw: "https://images.unsplash.com/photo-123?ixid=abc", full: "https://images.unsplash.com/photo-123?ixid=abc&w=3000",
    regular: "https://images.unsplash.com/photo-123?ixid=abc&w=1080", small: "https://images.unsplash.com/photo-123?ixid=abc&w=400",
    thumb: "https://images.unsplash.com/photo-123?ixid=abc&w=200",
  },
  links: { html: "https://unsplash.com/photos/abc123", download_location: "https://api.unsplash.com/photos/abc123/download" },
  user: { name: "Jane Doe", username: "jane", links: { html: "https://unsplash.com/@jane" } },
};

test("descriptor uses the native media provider contract", () => {
  const descriptor = unsplash({ utmSource: "su-gloria" });
  assert.equal(descriptor.entrypoint, "emdash-media-unsplash/runtime");
  assert.deepEqual(descriptor.capabilities, { browse: true, search: true, upload: false, delete: false });
  assert.equal(JSON.stringify(descriptor).includes("secret-key"), false);
});

test("mapping keeps hotlink, dimensions, alt, and attribution in media metadata", () => {
  const item = mapUnsplashPhoto(photo, "su-gloria");
  assert.equal(item.previewUrl, photo.urls.small);
  assert.equal(item.alt, photo.alt_description);
  assert.equal(item.width, 4000);
  assert.equal(item.meta.downloadLocation, photo.links.download_location);
  assert.match(item.meta.attribution.creatorUrl, /utm_source=su-gloria/);
  assert.match(item.meta.attribution.creatorUrl, /utm_medium=referral/);
});

test("API search and tracking authenticate server-side and use the tracking location", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/search/photos")) return new Response(JSON.stringify({ results: [photo], total_pages: 2 }), { status: 200 });
    return new Response(JSON.stringify({ url: photo.urls.raw }), { status: 200 });
  };
  const client = new UnsplashClient(() => "secret-key", request);
  const result = await client.searchPhotos("stone church", 1, 24);
  assert.equal(result.photos[0].id, "abc123");
  assert.equal(result.nextPage, 2);
  assert.match(calls[0].url, /query=stone\+church/);
  await client.trackDownload(photo.id, photo.links.download_location);
  assert.equal(calls[1].url, photo.links.download_location);
  assert.equal(calls[1].options.headers.Authorization, "Client-ID secret-key");
  await assert.rejects(() => client.trackDownload(photo.id, "https://evil.example/photos/abc123/download"));
});

test("API requests preserve the fetch receiver required by Cloudflare Workers", async () => {
  const workerFetch = function (_url, _options) {
    if (this !== globalThis) throw new TypeError("Illegal invocation: function called with incorrect `this` reference");
    return Promise.resolve(new Response("[]", { status: 200 }));
  };
  const client = new UnsplashClient(() => "test-access-key", workerFetch);
  const page = await client.listPhotos();
  assert.deepEqual(page.photos, []);
});
