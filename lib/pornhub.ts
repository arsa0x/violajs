export type PornhubThumb = {
  size: string;
  width: string;
  height: string;
  src: string;
};
export type PornhubTag = { tag_name: string };
export type PornhubStar = { pornstar_name: string };
export type PornhubCategory = { category: string };

export type PornhubSearchResult = {
  duration: string;
  views: number;
  video_id: string;
  rating: number | string;
  ratings: number;
  title: string;
  url: string;
  default_thumb: string;
  thumb: string;
  publish_date: string;
  thumbs: PornhubThumb[];
  tags: PornhubTag[];
  pornstars: PornhubStar[];
  categories: PornhubCategory[];
  segment: string;
};

export const SEARCH_ORDERS = [
  "featured",
  "newest",
  "mostviewed",
  "rating",
] as const;
export const SEARCH_PERIODS = ["weekly", "monthly", "alltime"] as const;

export type SearchOrder = (typeof SEARCH_ORDERS)[number];
export type SearchPeriod = (typeof SEARCH_PERIODS)[number];

export const isSearchOrder = (v: string): v is SearchOrder =>
  (SEARCH_ORDERS as readonly string[]).includes(v);

export const isSearchPeriod = (v: string): v is SearchPeriod =>
  (SEARCH_PERIODS as readonly string[]).includes(v);

type SearchResponse = {
  videos?: PornhubSearchResult[];
  code?: string | number;
  message?: string;
};

export class PornhubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PornhubError";
  }
}

export class Pornhub {
  readonly BASE = "https://www.pornhub.com/webmasters";
  private readonly timeoutMs = 10_000;

  /*
   * Search videos through the Webmasters API.
   * Returns an empty array when nothing matches; throws PornhubError on
   * network/HTTP/parse failures so callers can tell the two cases apart.
   */
  search = async (
    query: string,
    page: number = 1,
    ordering: SearchOrder = "newest",
    period: SearchPeriod = "alltime",
  ): Promise<PornhubSearchResult[]> => {
    const url = new URL(`${this.BASE}/search`);
    url.search = new URLSearchParams({
      search: query.trim(),
      page: String(page),
      ordering,
      period,
      thumbsize: "medium",
    }).toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new PornhubError(`Request failed: ${(err as Error).message}`);
    }

    if (!response.ok) {
      throw new PornhubError(`HTTP ${response.status}`, response.status);
    }

    let data: SearchResponse;
    try {
      data = (await response.json()) as SearchResponse;
    } catch {
      throw new PornhubError("Invalid JSON in response");
    }

    return Array.isArray(data.videos) ? data.videos : [];
  };
}
