import type { Posts, Series } from "@lib/nekopoi";

const MAX_EPISODES = 50;

/** The API returns WordPress HTML in description / content / note. */
export function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|li)>\s*/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&") // last, so "&amp;lt;" is not double-decoded
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function field(label: string, value?: string | null): string | null {
  const v = value?.trim();
  return v ? `${label}: ${v}` : null;
}

function compact(lines: (string | null | undefined)[]): string[] {
  return lines.filter((l): l is string => !!l);
}

// "hentai" = collection of episodes
export function formatSeries(s: Series): string {
  const m = s.info_meta;
  const genres = m.genre?.map((g) => g.name).join(", ");
  const episodes = s.episode ?? [];
  const episodeLines = episodes
    .slice(0, MAX_EPISODES)
    .map((e) => `${e.title} (id: ${e.id})`);

  return compact([
    `*${s.title ?? `Series #${s.id}`}*`,
    field("ID", String(s.id)),
    field("Aliases", m.aliases),
    field("Status", m.status),
    field("Score", m.skor),
    field("Duration", m.durasi),
    field("Episodes", m.episode),
    field("Producer", m.produser),
    field("Aired", m.tayang),
    field("Genres", genres),
    s.description ? `\n${stripHtml(s.description)}` : null,
    episodeLines.length
      ? `\n*Episodes*\n${episodeLines.join("\n")}` +
        (episodes.length > MAX_EPISODES
          ? `\n...and ${episodes.length - MAX_EPISODES} more`
          : "") +
        `\n\nUse .nekopoi -i <episode id> --post`
      : null,
  ]).join("\n");
}

// "post" = single episode / single video
export function formatPost(p: Posts): string {
  const streams = p.stream.map((s, i) => `Stream ${i + 1}: ${s.link}`);

  const downloads = p.download.map((group) => {
    const label = /^\d+$/.test(group.type) ? `${group.type}P` : group.type;
    const links = group.links.map((l) => `${l.name}: ${l.link}`);
    return `*${label}*\n${links.join("\n")}`;
  });

  return compact([
    `*${p.title}*`,
    field("ID", String(p.id)),
    field("Date", p.date),
    field("Series", p.series?.title),
    p.content ? `\n${stripHtml(p.content)}` : null,
    p.note ? `\n${stripHtml(p.note)}` : null,
    p.streamnote ? stripHtml(p.streamnote) : null,
    streams.length ? `\n*Stream*\n${streams.join("\n")}` : null,
    downloads.length ? `\n*Download*\n${downloads.join("\n\n")}` : null,
  ]).join("\n");
}
