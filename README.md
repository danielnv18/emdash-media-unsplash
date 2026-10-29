# emdash-media-unsplash

An Unsplash media provider for EmDash 1.0.1. It adds an Unsplash tab to the existing Media Picker for browsing and searching images, and renders selected images from Unsplash's image CDN.

## Install from source

```bash
git clone https://github.com/danielnv18/emdash-media-unsplash.git
cd emdash-media-unsplash
npm ci
npm run build
# From your EmDash site's directory:
pnpm add /path/to/emdash-media-unsplash
```

The repository contains the source package. A site can install it from a checkout until an npm release is available.

Register the provider in the site's `astro.config.mjs`:

```js
import emdash from "emdash/astro";
import { unsplash } from "emdash-media-unsplash";

emdash({
  // Keep the site's existing database, storage, and plugin configuration.
  mediaProviders: [unsplash({ utmSource: "your-site" })],
});
```

Set `UNSPLASH_ACCESS_KEY` as a server secret before starting the site. For local Cloudflare development, put it in `.dev.vars`; for deployment, use `pnpm wrangler secret put UNSPLASH_ACCESS_KEY`. The provider descriptor stores only the environment variable name. The key is read at runtime and sent to `api.unsplash.com` in a `Client-ID` header; it is never sent to the editor's browser. Editors do not need Unsplash accounts.

`unsplash()` accepts:

| Option | Purpose | Default |
| --- | --- | --- |
| `utmSource` | Required referral identifier in attribution links. Use letters, numbers, underscores, or hyphens. | None |
| `accessKeyEnvVar` | Name of the server secret containing the Unsplash access key. | `UNSPLASH_ACCESS_KEY` |
| `defaultWidth` | Width requested for a rendered image when the host does not supply one. | `1200` |

The provider supports browsing `/photos`, searching `/search/photos`, refreshing one item through `/photos/:id`, and responsive CDN URLs. It caps Unsplash API pages at 30 items and returns `nextCursor` for hosts that support pagination. The EmDash 1.0.1 picker currently displays the first page and searches as an editor types.

## Attribution and download tracking

The returned `MediaProviderItem.meta` includes photographer, photo, attribution links, and Unsplash's download tracking location. The host must show linked photographer and Unsplash credit wherever it displays a selected photo, including in the editor and on public pages. It must use the supplied Unsplash image URLs rather than copying image bytes into its own storage. When an editor chooses an image for a post or comparable use, the host must call Unsplash's download endpoint. This package exports `UnsplashClient.trackDownload(id, downloadLocation)` for that call, but it does not trigger it automatically because EmDash 1.0.1 has no media selection hook.

The [su-gloria site](https://github.com/danielnv18/su-gloria) has an example native content-save plugin and D1 retry queue for tracking new placements, public attribution rendering, and a version-specific admin picker patch for editor credit. Those pieces are site code, not included in this npm package. A site that installs only this package must supply its own equivalent integration. The site owner must also provide the privacy policy and Unsplash application setup required for its deployment.

This is a native media provider installed through npm and configured in `astro.config.mjs`. It is not a sandboxed EmDash registry plugin. The provider runtime runs in the host process, reads the configured secret, and makes requests to `api.unsplash.com`; review it as trusted site code. The [sandboxed plugin CLI tutorial](https://docs.emdashcms.com/plugins/creating-plugins/your-first-plugin/) scaffolds a different plugin format and cannot register a media provider tab.

## Develop and inspect the package

From this package directory, run:

```bash
pnpm run typecheck
pnpm run test
npm pack --dry-run
```

The `prepack` script builds `dist/` before `npm pack` or `npm publish`. Inspect the tarball contents and test the packed package in an EmDash site before publishing. The package exports its descriptor from `.` and its EmDash runtime from `./runtime`.


## Admin caching

The `emdash-media-unsplash/admin-cache` browser helper caches successful browsing and search results in local storage until local midnight. It limits stored pages, deduplicates concurrent requests, and falls back to memory when browser storage is unavailable. The cache contains public photo metadata, not credentials or drafts. Thumbnail preloading uses the original hotlinked URLs and is best effort.

This helper requires integration with the host's admin UI. It does not automatically provide picker attribution, public credits, or download tracking. The su-gloria site maintains a version-specific EmDash admin patch for its picker.
