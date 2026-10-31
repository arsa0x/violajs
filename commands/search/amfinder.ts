import { defineCommand } from "@core/command";

const BASE = "https://xzeerhpreset-amfinder.vercel.app";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

function parseTikTokUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Masukkan URL video TikTok yang lengkap.");
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!["tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(host)) {
    throw new Error("URL harus berasal dari TikTok.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Hanya URL HTTP/HTTPS yang didukung.");
  }
  return url;
}

function findCookie(headers: Headers, html: string): string | undefined {
  const fromHeader = headers.get("set-cookie") ?? "";
  const combined = `${fromHeader}\n${html}`;
  const match = combined.match(/am_c=([^;,"'\s]+)/);
  return match?.[1] ? `am_c=${match[1]}` : undefined;
}

export default defineCommand({
  name: "amfinder",
  aliases: ["presetfind", "ampf"],
  category: "search",
  description: "Find Alight Motion presets related to a public TikTok video",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .amfinder <url video TikTok>");
      return;
    }

    try {
      const target = parseTikTokUrl(input);
      const home = await fetch(`${BASE}/`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!home.ok) throw new Error(`AM Finder membalas HTTP ${home.status} saat membuka halaman.`);

      const html = await home.text();
      const cookie = findCookie(home.headers, html);
      if (!cookie) throw new Error("Cookie sesi AM Finder tidak ditemukan. Layanan mungkin telah berubah.");

      const endpoint = new URL("/api/find", BASE);
      endpoint.searchParams.set("url", target.href);
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/plain, */*",
          Referer: `${BASE}/`,
          Cookie: cookie,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error("Layanan menolak sesi. Coba lagi nanti.");
      }
      if (!response.ok) throw new Error(`AM Finder membalas HTTP ${response.status}.`);

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        video?: {
          description?: string;
          url?: string;
          views?: number;
          likes?: number;
          comments?: number;
          shares?: number;
        };
        author?: { nickname?: string; uniqueId?: string };
        presets?: Array<{
          title?: string;
          detail?: string;
          type?: string;
          url?: string;
          source?: string;
        }>;
      };

      if (data.ok === false) throw new Error(data.error || "AM Finder gagal memproses video.");
      const presets = Array.isArray(data.presets) ? data.presets.slice(0, 8) : [];
      const video = data.video ?? {};
      const author = data.author ?? {};

      if (presets.length === 0) {
        await ctx.send.text("Tidak ada preset yang ditemukan untuk video ini.");
        return;
      }

      const header = [
        "*Alight Motion Preset Finder*",
        author.nickname ? `Creator: ${author.nickname}${author.uniqueId ? ` (@${author.uniqueId})` : ""}` : undefined,
        video.description ? `Video: ${video.description.replace(/\s+/g, " ").slice(0, 220)}` : undefined,
        `Preset ditemukan: ${presets.length}`,
        "",
      ].filter((line): line is string => line !== undefined);

      const items = presets.map((preset, index) => {
        const title = preset.title?.trim() || `Preset ${index + 1}`;
        const details = preset.detail?.trim();
        const url = preset.url;
        return [
          `${index + 1}. *${title}*${preset.type ? ` [${preset.type}]` : ""}`,
          details ? details.replace(/\s+/g, " ").slice(0, 240) : undefined,
          url ? `Link: ${url}` : undefined,
          preset.source ? `Ditemukan dari: ${preset.source}` : undefined,
        ].filter((line): line is string => line !== undefined).join("\n");
      });

      await ctx.send.text(`${header.join("\n")}${items.join("\n\n")}\n\nVideo sumber: ${video.url ?? target.href}`);
    } catch (error) {
      ctx.log.warn("AM Finder lookup failed", error);
      await ctx.send.text(
        error instanceof Error ? `Gagal mencari preset: ${error.message}` : "Gagal mencari preset.",
      );
    }
  },
});
