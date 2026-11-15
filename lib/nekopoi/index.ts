import type { BotConfig } from "@src/types/config";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Category ids accepted by the `all` endpoint (`category` param). */
export const NEKOPOI_CATEGORIES = {
  hentai: 2,
  jav: 4,
  hentai3d: 81,
  animation2d: 682,
  javCosplay: 1,
} as const;

export type NekopoiCategory =
  (typeof NEKOPOI_CATEGORIES)[keyof typeof NEKOPOI_CATEGORIES];

/**
 * Query key for the `type` param of `listall`. In the decompiled app it is an
 * obfuscated constant (`k.EVENT_TYPE_KEY`), so "type" is an assumption: verify
 * it against a real request if `listAll` returns unexpected results.
 */
const LISTALL_TYPE_KEY = "type";

/* -------------------------------------------------------------------------- */
/*  Types (JSON shapes, i.e. the serde-renamed names)                         */
/* -------------------------------------------------------------------------- */

/** The API returns `false` instead of a URL when there is no image. */
export type ImageField = string | boolean;

export type PageResult<T> = {
  total: number;
  totalPages: number;
  result?: T[];
};

/**
 * One hit of `search()`.
 * - `type`: "post" = single episode/video (open with `post()`),
 *   "hentai" = series with episodes (open with `series()`).
 * - `date` is human readable ("November 12, 2026"), not ISO.
 * - `image` is a 150x150 thumbnail URL.
 */
export type SearchResult = {
  id: number;
  date: string;
  title: string;
  image: ImageField;
  slug?: string | null;
  type: string;
};

export type SearchByGenreResult = SearchResult & { link?: string | null };

/**
 * One item of `all()`. Always a single episode/video, so open it with
 * `post()`. `date` is "YYYY-MM-DD HH:mm:ss". There is no `type` field.
 */
export type AllListResult = {
  id: number;
  date: string;
  title: string;
  image: ImageField;
  link?: string | null;
  slug?: string | null;
};

export type GetListResult = {
  id: number;
  date: string;
  title: string;
  image: ImageField;
};

export type Genre = { id: number; name: string };

export type SearchListGenres = { total: number; data: Genre[] };

export type SeriesEpisode = {
  id: number;
  date: string;
  title: string;
  image: ImageField;
  slug?: string | null;
};

export type SeriesInfoMeta = {
  aliases: string;
  durasi: string;
  episode: string;
  genre?: { term_id: number; name: string; slug?: string | null }[] | null;
  produser: string;
  skor: string;
  status: string;
  tayang: string;
};

/**
 * Result of `series()`: a title with its episode list.
 * - `description` contains a little HTML (`<strong>`, `\r\n`).
 * - `episode[].id` is what you pass to `post()`.
 * - `episode[].date` is localized text ("Agustus 16, 2026").
 */
export type Series = {
  id: number;
  date: string;
  description: string;
  image: ImageField;
  title?: string | null;
  episode?: SeriesEpisode[] | null;
  info_meta: SeriesInfoMeta;
};

export type PostsSeries = {
  id: number;
  title: string;
  content: string;
  genre: string;
  image: ImageField;
};

export type PostsDownloadLinks = { name: string; link: string };

/** `type` is the resolution, e.g. "360", "480", "720". */
export type PostsDownload = { type: string; links: PostsDownloadLinks[] };

/**
 * Result of `post()`: one episode/video.
 * - `content` is WordPress HTML holding the metadata (original title, genre,
 *   file sizes, notes). Use `stripHtml()` from the formatter.
 * - `series` is null for standalone posts.
 * - `stream[].link` are embed URLs, `download[].links[].link` are ouo.io
 *   shortlinks.
 */
export type Posts = {
  id: number;
  date: string;
  title: string;
  content: string;
  note: string;
  image: ImageField;
  slug?: string | null;
  /** `null` for standalone posts (e.g. JAV / 3D) */
  series: PostsSeries | null;
  download: PostsDownload[];
  stream: { link: string }[];
  streamnote: string;
};

export type RecentItem = {
  id: number;
  date: string;
  title: string;
  slug?: string | null;
  description: string;
  image: ImageField;
};

export type RecentPostItem = {
  id: number;
  date: string;
  title: string;
  slug?: string | null;
  image: ImageField;
  description: string | null;
};

/** One group per category ("Hentai", "2D Animation", "3D Hentai", ...). */
export type RecentPost = { category: string; data: RecentPostItem[] };

/**
 * Result of `recent()`.
 * - `carousel`: ~10 featured series (id works with `series()`).
 * - `posts`: one group per category with ~10 newest episodes each
 *   (id works with `post()`).
 */
export type Recent = { carousel: RecentItem[]; posts: RecentPost[] };

export type QueryValue =
  string | number | boolean | null | undefined | ReadonlyArray<string | number>;

export type Queries = Record<string, QueryValue>;

/* -------------------------------------------------------------------------- */
/*  Errors                                                                    */
/* -------------------------------------------------------------------------- */

export class NekopoiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: string,
  ) {
    super(`Nekopoi request failed: ${status} ${url}`);
    this.name = "NekopoiError";
  }
}

/* -------------------------------------------------------------------------- */
/*  Client                                                                    */
/* -------------------------------------------------------------------------- */

export class Nekopoi {
  // nekopoi_base
  base: string;
  // nekopoi_paths
  paths: string;
  // nekopoi_build_code
  build_code: string;
  // nekopoi_signature
  signature: string;
  // nekopoi_user_agent
  user_agent: string;
  // nekopoi_token
  token: string;

  constructor(config: BotConfig) {
    this.base = config.nekopoi_base ?? "";
    this.paths = config.nekopoi_paths ?? "";
    this.build_code = config.nekopoi_build_code ?? "";
    this.signature = config.nekopoi_signature ?? "";
    this.user_agent = config.nekopoi_user_agent ?? "";
    this.token = config.nekopoi_token ?? "";
  }

  /** Joins base + paths + path with exactly one slash between each part. */
  buildUrl(path: string, queries?: Queries): string {
    const trim = (s: string) => s.replace(/^\/+|\/+$/g, "");
    let url = [this.base.replace(/\/+$/, ""), trim(this.paths), trim(path)]
      .filter(Boolean)
      .join("/");

    if (queries) {
      const params = new URLSearchParams();

      for (const [key, value] of Object.entries(queries)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
          // Retrofit style: `term=1&term=2`
          for (const item of value) params.append(key, String(item));
        } else {
          params.append(key, String(value));
        }
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    return url;
  }

  /** Low-level call: returns the raw Response. */
  async nekofetch(
    path: string,
    queries?: Queries,
    method: string = "GET",
  ): Promise<Response> {
    return fetch(this.buildUrl(path, queries), {
      headers: {
        AppBuildCode: this.build_code,
        Token: this.token,
        Accept: "application/json",
        AppSignature: this.signature,
        "User-Agent": this.user_agent,
      },
      method,
    });
  }

  /** Calls the API, throws NekopoiError on non-2xx, returns parsed JSON. */
  private async request<T>(path: string, queries?: Queries): Promise<T> {
    const response = await this.nekofetch(path, queries);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new NekopoiError(
        response.status,
        this.buildUrl(path, queries),
        body.slice(0, 500),
      );
    }

    return (await response.json()) as T;
  }

  /* ---------------------------------------------------------------------- */
  /*  Endpoints                                                             */
  /*  Examples below come from real responses (long arrays cut for brevity) */
  /* ---------------------------------------------------------------------- */

  /**
   * GET /search?q=&page=
   *
   * `result` is missing when nothing matched. Observed: page 1 returned 200
   * items while `totalPages` was 54, so don't assume a fixed page size.
   *
   * @example
   * {
   *   "total": 200,
   *   "totalPages": 54,
   *   "result": [
   *     { "id": 64584, "date": "November 11, 2026", "title": "Harem Shima e Youkoso!",
   *       "image": "https://.../Harem-Shima-e-Youkoso2-150x150.jpg", "type": "hentai" },
   *     { "id": 68127, "date": "November 10, 2026", "title": "Hitori Tsuma Episode 1",
   *       "image": "https://.../...-150x150.jpg", "type": "post" }
   *   ]
   * }
   */
  search(query: string, page = 1) {
    return this.request<PageResult<SearchResult>>("/search", {
      q: query,
      page,
    });
  }

  /**
   * GET /all?category=&page=
   *
   * Newest first, 200 items per page (observed). Use `NEKOPOI_CATEGORIES` for
   * the category id. Every item is an episode/video, so open it with `post()`.
   *
   * @example
   * {
   *   "total": 9542,
   *   "totalPages": 48,
   *   "result": [
   *     { "id": 68127, "date": "2026-11-10 00:09:43",
   *       "title": "[NEW Release] Hitori Tsuma Episode 1 Subtitle Indonesia",
   *       "slug": "hitori-tsuma-episode-1-subtitle-indonesia",
   *       "image": "https://.../vlcsnap-...-150x150.jpg" }
   *   ]
   * }
   */
  all(category: NekopoiCategory | string | number, page = 1) {
    return this.request<PageResult<AllListResult>>("/all", {
      category,
      page,
    });
  }

  /**
   * GET /series?id=   (id of a "hentai" search result / recent carousel item)
   *
   * @example
   * {
   *   "id": 64584,
   *   "date": "2026-11-11 18:38:30",
   *   "title": "Harem Shima e Youkoso!",
   *   "description": "Sebuah klub eksplorasi ... \r\nNamun, ...",
   *   "image": "https://.../Harem-Shima-e-Youkoso2-150x150.jpg",
   *   "info_meta": {
   *     "aliases": "ハーレム島へようこそ!", "episode": "2", "status": "Completed",
   *     "tayang": "Jul 31, 2026", "produser": "Collaboration Works",
   *     "durasi": "16 min", "skor": "7.00",
   *     "genre": [ { "term_id": 48, "name": "Ahegao", "slug": "ahegao" } ]
   *   },
   *   "episode": [
   *     { "id": 64585, "date": "Agustus 16, 2026",
   *       "title": "Harem Shima e Youkoso! Episode 1 Subtitle Indonesia",
   *       "image": "https://.../...-150x150.jpg" }
   *   ]
   * }
   */
  series(id: number) {
    return this.request<Series>("/series", { id });
  }

  /**
   * GET /genre
   *
   * @example
   * { "total": 78, "data": [ { "id": 72, "name": "Action" }, { "id": 48, "name": "Ahegao" } ] }
   */
  genres() {
    return this.request<SearchListGenres>("/genre");
  }

  /**
   * GET /searchByGenre?term=1&term=2
   *
   * NOT verified against the live server yet. Expected to be a
   * `PageResult<SearchByGenreResult>` (same as `search()` plus `link`).
   */
  searchByGenre(genreIds: number[]) {
    return this.request<PageResult<SearchByGenreResult>>("/searchByGenre", {
      term: genreIds,
    });
  }

  /**
   * GET /recent
   *
   * `carousel` = featured series, `posts` = newest episodes grouped by
   * category ("Hentai", "2D Animation", "3D Hentai", ...), ~10 each.
   * `posts[].data[].description` is null.
   *
   * @example
   * {
   *   "carousel": [
   *     { "id": 64584, "date": "2026-11-11 18:38:30", "title": "Harem Shima e Youkoso!",
   *       "slug": "harem-shima-e-youkoso", "image": "https://.../...jpg",
   *       "description": "Sebuah klub eksplorasi ... <strong>Pulau Harem</strong> ..." }
   *   ],
   *   "posts": [
   *     { "category": "Hentai", "data": [
   *       { "id": 68127, "date": "2026-11-10 00:09:43",
   *         "title": "[NEW Release] Hitori Tsuma Episode 1 Subtitle Indonesia",
   *         "slug": "hitori-tsuma-episode-1-subtitle-indonesia",
   *         "image": "https://.../...-150x150.jpg", "description": null }
   *     ] }
   *   ]
   * }
   */
  recent() {
    return this.request<Recent>("/recent");
  }

  /**
   * GET /listall?letter=&type=&page=
   *
   * NOT verified against the live server yet (the `type` query key is an
   * assumption, see LISTALL_TYPE_KEY). Expected `PageResult<GetListResult>`.
   */
  listAll(letter: string, type: string, page = 1) {
    return this.request<PageResult<GetListResult>>("/listall", {
      letter,
      [LISTALL_TYPE_KEY]: type,
      page,
    });
  }

  /**
   * GET /post?id=   (id of a "post" search result, an `all()` item or a
   * `series().episode[]` item)
   *
   * @example
   * {
   *   "id": 68127,
   *   "date": "2026-11-10 00:09:43",
   *   "title": "...",
   *   "content": "<p><strong>Original Title : </strong>...</p>\r\n<p><strong>Size : 360P : </strong>156mb ...</p>",
   *   "image": "https://.../....jpg",
   *   "series": null,
   *   "note": "",
   *   "streamnote": "",
   *   "stream": [ { "link": "https://playmogo.com/e/..." }, { "link": "https://streampoi.com/embed-....html" } ],
   *   "download": [
   *     { "type": "360", "links": [
   *       { "name": "Mp4Upload", "link": "https://ouo.io/..." },
   *       { "name": "PixelDrain", "link": "https://ouo.io/..." }
   *     ] },
   *     { "type": "480", "links": [ ... ] },
   *     { "type": "720", "links": [ ... ] }
   *   ]
   * }
   */
  post(id: number) {
    return this.request<Posts>("/post", { id });
  }
}
