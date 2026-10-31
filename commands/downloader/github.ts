import { defineCommand } from "@core/command";

const USER_AGENT = "violajs/1.0 (GitHub repository archive resolver)";

function parseRepository(input: string): { owner: string; repo: string } {
  const value = input.trim().replace(/\.git$/i, "");
  let path = value;

  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.hostname !== "github.com") {
      throw new Error("URL harus berasal dari github.com.");
    }
    path = url.pathname;
  }

  const parts = path.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]!) || !/^[A-Za-z0-9_.-]+$/.test(parts[1]!)) {
    throw new Error("Format repository tidak valid. Gunakan owner/repo atau URL GitHub.");
  }

  return { owner: parts[0]!, repo: parts[1]! };
}

export default defineCommand({
  name: "githubdl",
  aliases: ["ghdl", "repozip"],
  category: "downloader",
  description: "Get a ZIP archive link for a public GitHub repository",
  async execute(ctx) {
    const input = ctx.rawArgs.join(" ").trim();
    if (!input) {
      await ctx.send.text("Penggunaan: .githubdl <owner/repo atau URL repository>");
      return;
    }

    try {
      const { owner, repo } = parseRepository(input);
      const response = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": USER_AGENT,
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (response.status === 404) {
        throw new Error("Repository tidak ditemukan atau bersifat privat.");
      }
      if (response.status === 403) {
        throw new Error("GitHub membatasi request (rate limit). Coba lagi nanti.");
      }
      if (!response.ok) throw new Error(`GitHub API membalas HTTP ${response.status}.`);

      const data = (await response.json()) as {
        full_name?: string;
        html_url?: string;
        description?: string | null;
        default_branch?: string;
        private?: boolean;
        archived?: boolean;
        stargazers_count?: number;
        language?: string | null;
        size?: number;
      };

      if (data.private) throw new Error("Repository privat tidak dapat diunduh.");
      const branch = data.default_branch || "main";
      const archiveUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/archive/refs/heads/${encodeURIComponent(branch)}.zip`;
      const details = [
        `*GitHub Repository: ${data.full_name ?? `${owner}/${repo}`}*`,
        data.description ? data.description : undefined,
        `Branch default: ${branch}`,
        data.language ? `Bahasa: ${data.language}` : undefined,
        typeof data.stargazers_count === "number" ? `Stars: ${data.stargazers_count}` : undefined,
        data.archived ? "Status: archived" : undefined,
        "",
        `Repository: ${data.html_url ?? `https://github.com/${owner}/${repo}`}`,
        `ZIP download: ${archiveUrl}`,
      ].filter((line): line is string => line !== undefined);

      await ctx.send.text(details.join("\n"));
    } catch (error) {
      ctx.log.warn("GitHub archive resolver failed", error);
      await ctx.send.text(
        error instanceof Error ? `Gagal mengambil repository: ${error.message}` : "Gagal mengambil repository.",
      );
    }
  },
});
