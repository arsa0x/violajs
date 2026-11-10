import { defineCommand } from "@core/command";

type YouTubeOEmbed = {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  provider_name?: string;
};

function parseYouTubeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Masukkan URL YouTube yang lengkap.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    throw new Error("URL harus berasal dari YouTube.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Hanya URL HTTP/HTTPS yang didukung.");
  }
  if (
    (host === "youtube.com" || host === "m.youtube.com") &&
    !url.pathname.startsWith("/watch") &&
    !url.pathname.startsWith("/shorts/") &&
    !url.pathname.startsWith("/embed/")
  ) {
    throw new Error("Tautan YouTube harus mengarah ke video atau Shorts.");
  }
  return url;
}

export default defineCommand({
  name: "ytinfo",
  aliases: ["youtubeinfo", "ytmeta"],
  category: "search",
  description: "Get public YouTube video metadata",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .ytinfo <url video YouTube>");
      return;
    }

    try {
      const target = parseYouTubeUrl(input);
      const endpoint = new URL("https://www.youtube.com/oembed");
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("url", target.href);

      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.status === 404 || response.status === 401) {
        throw new Error(
          "Video tidak ditemukan, privat, atau tidak dapat disematkan.",
        );
      }
      if (!response.ok)
        throw new Error(`YouTube membalas HTTP ${response.status}.`);

      const data = (await response.json()) as YouTubeOEmbed;
      if (!data.title) throw new Error("Metadata video tidak tersedia.");

      const lines = [
        `*${data.title}*`,
        data.author_name ? `Channel: ${data.author_name}` : undefined,
        data.author_url ? `Channel URL: ${data.author_url}` : undefined,
        data.thumbnail_url ? `Thumbnail: ${data.thumbnail_url}` : undefined,
        "",
        `Tonton: ${target.href}`,
      ].filter((line): line is string => line !== undefined);

      await ctx.send.text(lines.join("\n"));
    } catch (error) {
      ctx.log.warn("YouTube metadata lookup failed", error);
      await ctx.send.text(
        error instanceof Error
          ? `Gagal mengambil metadata YouTube: ${error.message}`
          : "Gagal mengambil metadata YouTube.",
      );
    }
  },
});
