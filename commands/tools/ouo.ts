import { defineCommand } from "@core/command";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0";

const ALLOWED_HOSTS = new Set(["ouo.io", "ouo.press"]);

function collectCookies(setCookie: string[]): string {
  return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
}

function parseInput(input: string): URL {
  let url: URL;

  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error("URL tidak valid");
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error("Host harus ouo.io atau ouo.press");
  }

  return url;
}

export async function resolveOuo(input: string): Promise<string> {
  const url = parseInput(input);

  const host = url.hostname;
  const id = url.pathname.replace(/^\/+/, "");

  if (!id) {
    throw new Error("ID OUO tidak ditemukan");
  }

  const baseHeaders: Record<string, string> = {
    Host: host,
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Site": "same-origin",
  };

  const init = await fetch(url.href, {
    headers: baseHeaders,
  });

  if (!init.ok) {
    throw new Error(`Gagal membuka link (HTTP ${init.status})`);
  }

  const html = await init.text();

  const $ = cheerio.load(html);
  const token = $('input[name="_token"]').val();

  if (typeof token !== "string" || !token) {
    throw new Error("Token tidak ditemukan (link mati / diblokir)");
  }

  const cookies = collectCookies(init.headers.getSetCookie());

  const body = new URLSearchParams({
    _token: token,
    "x-token": "",
  });

  const response = await fetch(`https://${host}/xreallcygo/${id}`, {
    method: "POST",

    headers: {
      ...baseHeaders,
      "Content-Type": "application/x-www-form-urlencoded",

      ...(cookies
        ? {
            Cookie: cookies,
          }
        : {}),

      Referer: `https://${host}/go/${id}`,
      Origin: `https://${host}`,
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      Priority: "u=0, i",
    },
    body,
    redirect: "manual",
  });

  const location = response.headers.get("location");

  if (!location || /\/\/ouo\.(io|press)\/?$/i.test(location)) {
    throw new Error("Gagal resolve (kemungkinan diblokir captcha)");
  }

  return location;
}

export default defineCommand({
  name: "ouo",
  aliases: ["ouoresolve"],

  async execute(ctx) {
    const input = ctx.args[0];

    if (!input) {
      await ctx.reply.text("Usage: .ouo <url>");

      return;
    }

    try {
      const result = await resolveOuo(input);

      await ctx.reply.text(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal resolve URL";

      await ctx.reply.text(message);
    }
  },
});
