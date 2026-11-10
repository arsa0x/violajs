import { defineCommand } from "@core/command";

const ENDPOINT = "https://www.videodownloadertools.com/fetch_api.php";
const SITE = "https://www.videodownloadertools.com/";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

type MediaOption = {
  url?: string;
  link?: string;
  download_url?: string;
  quality?: string | number;
  label?: string;
  resolution?: string;
  height?: string | number;
  format?: string;
  ext?: string;
  extension?: string;
  type?: string;
  size?: string | number;
};

function parsePublicUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL tidak valid. Gunakan URL lengkap dengan https://");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Hanya URL HTTP/HTTPS yang didukung.");
  }
  if (url.username || url.password || !url.hostname.includes(".")) {
    throw new Error("URL tidak valid.");
  }
  if (
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname)
  ) {
    throw new Error("URL lokal atau jaringan privat tidak didukung.");
  }
  return url;
}

function formatOption(option: MediaOption, index: number): string | undefined {
  const url = option.url ?? option.link ?? option.download_url;
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) return;

  const quality =
    option.quality ??
    option.label ??
    option.resolution ??
    (option.height ? `${option.height}p` : undefined) ??
    "Kualitas tidak diketahui";
  const format = String(option.extension ?? option.ext ?? option.format ?? "")
    .replace(/^\./, "")
    .toUpperCase();

  return `${index + 1}. ${quality}${format ? ` · ${format}` : ""}${option.size ? ` · ${option.size}` : ""}\n${url}`;
}

export default defineCommand({
  name: "aio",
  aliases: ["dl", "alldl"],
  category: "downloader",
  description: "Resolve media links using an all-in-one downloader service",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .aio <url media>");
      return;
    }

    let target: URL;
    try {
      target = parsePublicUrl(input);
    } catch (error) {
      await ctx.send.text(
        error instanceof Error ? error.message : "URL tidak valid.",
      );
      return;
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          Referer: SITE,
          Origin: new URL(SITE).origin,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: new URLSearchParams({ url: target.href }),
        signal: AbortSignal.timeout(25_000),
      });

      if (!response.ok) {
        throw new Error(`Layanan downloader membalas HTTP ${response.status}.`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object") {
        throw new Error("Respons layanan tidak valid.");
      }

      const payload = data as Record<string, unknown>;
      const raw = payload.medias ?? payload.links ?? payload.data;
      const options = Array.isArray(raw) ? (raw as MediaOption[]) : [];
      const formatted = options
        .map((option, index) => formatOption(option, index))
        .filter((value): value is string => Boolean(value))
        .slice(0, 8);

      if (formatted.length === 0) {
        const message = payload.message ?? payload.error;
        await ctx.send.text(
          `Tidak ada tautan unduhan yang ditemukan.${message ? `\nInfo: ${String(message)}` : ""}\n\nLayanan upstream mungkin sedang gagal atau tidak mendukung URL ini.`,
        );
        return;
      }

      const title =
        typeof payload.title === "string" ? payload.title : "Media ditemukan";
      const source =
        typeof payload.source === "string" ? payload.source : target.hostname;
      await ctx.send.text(
        `*${title}*\nSumber: ${source}\n\n${formatted.join("\n\n")}`,
      );
    } catch (error) {
      ctx.log.warn("AIO scraper failed", error);
      const message =
        error instanceof Error ? error.message : "Kesalahan tidak diketahui.";
      await ctx.send.text(`Gagal memproses URL: ${message}`);
    }
  },
});
