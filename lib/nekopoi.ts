import type { BotConfig } from "../src/types/config";

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

  async nekofetch(
    path: string,
    queries?: Record<string, any>,
    method?: string,
  ) {
    let urlString = `${this.base}/${this.paths}${path}`.replace(
      /([^:]\/)\/+/g,
      "$1",
    );

    if (queries) {
      const searchParams = new URLSearchParams();

      Object.entries(queries).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();

      if (queryString) {
        urlString += `?${queryString}`;
      }
    }

    return fetch(urlString, {
      headers: {
        AppBuildCode: this.build_code,
        Token: this.token,
        Accept: "application/json",
        AppSignature: this.signature,
        "User-Agent": this.user_agent,
      },
      method: method,
    });
  }

  async search(query: string, page: number) {
    const response = await this.nekofetch("/search", {
      q: query,
      page,
    });

    return response.json() as Promise<PageReuslt<SearchResult>>;
  }
}

type PageReuslt<type> = {
  total: number;
  totalPages: number;
  result?: type[];
};

type SearchResult = {
  id: number;
  date: string;
  title: string;
  image: string;
  type: string;
};
