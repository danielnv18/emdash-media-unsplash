export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  blur_hash?: string | null;
  color?: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: { html: string; download_location: string };
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
}

export interface UnsplashConfig {
  /** Name of a server-only environment secret. The key itself is never serialized. */
  accessKeyEnvVar?: string;
  /** Unsplash referral identifier for this site, for example "su-gloria". */
  utmSource: string;
  /** Width of the default frontend image URL, capped by the original width. */
  defaultWidth?: number;
}

export interface UnsplashMetadata {
  source: "unsplash";
  photographer: { name: string; username: string; profileUrl: string };
  photoUrl: string;
  downloadLocation: string;
  urls: UnsplashPhoto["urls"];
  attribution: {
    creatorName: string;
    creatorUrl: string;
    sourceName: "Unsplash";
    sourceUrl: string;
  };
}
