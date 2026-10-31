import { defineCommand } from "@core/command";

type SpotifyEmbed = {
  title?: string;
  author_name?: string;
  provider_name?: string;
  thumbnail_url?: string;
  html?: string;
};

function parseSpotifyUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Masukkan URL Spotify yang lengkap.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    !(url.hostname === "open.spotify.com" || url.hostname === "spotify.link")
  ) {
    throw new Error("URL harus berasal dari Spotify.");
  }

  const normalizedPath = url.pathname.replace(/^\/intl-[a-z]{2}(?:-[a-z]{2})?\//i, "/");
  if (!/^\/(track|album|playlist|episode|show)\//.test(normalizedPath) && url.hostname !== "spotify.link") {
    throw new Error("Tautan Spotify harus mengarah ke track, album, playlist, episode, atau show.");
  }
  return url;
}

export default defineCommand({
  name: "spotify",
  aliases: ["spinfo", "spotifyinfo"],
  category: "search",
  description: "Get public Spotify track, album, or playlist metadata",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .spotify <url Spotify>");
      return;
    }

    try {
      const target = parseSpotifyUrl(input);
      const endpoint = new URL("https://open.spotify.com/oembed");
      endpoint.searchParams.set("url", target.href);

      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.status === 404 || response.status === 400) {
        throw new Error("Konten Spotify tidak ditemukan atau tidak dapat disematkan.");
      }
      if (!response.ok) throw new Error(`Spotify membalas HTTP ${response.status}.`);

      const data = (await response.json()) as SpotifyEmbed;
      if (!data.title) throw new Error("Metadata tidak tersedia untuk tautan ini.");

      const lines = [
        `*${data.title}*`,
        data.author_name ? `Artis / pemilik: ${data.author_name}` : undefined,
        data.provider_name ? `Sumber: ${data.provider_name}` : "Sumber: Spotify",
        data.thumbnail_url ? `Cover: ${data.thumbnail_url}` : undefined,
        "",
        `Buka di Spotify: ${target.href}`,
      ].filter((line): line is string => line !== undefined);

      await ctx.send.text(lines.join("\n"));
    } catch (error) {
      ctx.log.warn("Spotify metadata lookup failed", error);
      await ctx.send.text(
        error instanceof Error ? `Gagal mengambil metadata Spotify: ${error.message}` : "Gagal mengambil metadata Spotify.",
      );
    }
  },
});
