import { defineCommand } from "@core/command";
import type { InteractiveSelectSection } from "@lib/interactive";

type MenuCategory =
  | "tools"
  | "downloader"
  | "search"
  | "admin"
  | "nsfw";

const MENU: Record<MenuCategory, InteractiveSelectSection> = {
  tools: {
    title: "Tools",
    rows: [
      { title: ".ping", description: "Check bot response", id: ".ping" },
      { title: ".qr", description: "Generate a QR code", id: ".qr" },
      { title: ".sticker", description: "Create a sticker from media", id: ".sticker" },
      { title: ".ouo", description: "Resolve an OUO short link", id: ".ouo" },
      { title: ".interactive", description: "Try interactive message demos", id: ".interactive" },
    ],
  },
  downloader: {
    title: "Downloader",
    rows: [
      { title: ".aio", description: "Resolve media download links", id: ".aio" },
      { title: ".githubdl", description: "Get a GitHub repository ZIP link", id: ".githubdl" },
      { title: ".mediafire", description: "Resolve a MediaFire download link", id: ".mediafire" },
    ],
  },
  search: {
    title: "Search",
    rows: [
      { title: ".search", description: "Search the web", id: ".search" },
      { title: ".ytinfo", description: "Get YouTube video information", id: ".ytinfo" },
      { title: ".spotify", description: "Get Spotify link information", id: ".spotify" },
      { title: ".amfinder", description: "Find Alight Motion presets from TikTok", id: ".amfinder" },
    ],
  },
  admin: {
    title: "Group administration",
    rows: [
      { title: ".add", description: "Add a group participant", id: ".add" },
      { title: ".kick", description: "Remove a group participant", id: ".kick" },
      { title: ".promote", description: "Promote a participant to admin", id: ".promote" },
      { title: ".demote", description: "Demote a group admin", id: ".demote" },
      { title: ".open", description: "Allow all members to send messages", id: ".open" },
      { title: ".close", description: "Restrict messages to admins", id: ".close" },
      { title: ".linkgc", description: "Get the group invite link", id: ".linkgc" },
      { title: ".revokelink", description: "Reset the group invite link", id: ".revokelink" },
      { title: ".tagall", description: "Mention all group participants", id: ".tagall" },
      { title: ".hidetag", description: "Send a hidden-tag announcement", id: ".hidetag" },
    ],
  },
  nsfw: {
    title: "NSFW",
    rows: [
      { title: ".nekopoi", description: "Search Nekopoi content", id: ".nekopoi" },
    ],
  },
};

const CATEGORIES = Object.keys(MENU) as MenuCategory[];

function parseCategory(value: string | undefined): MenuCategory | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return CATEGORIES.find((category) => category === normalized);
}

export default defineCommand({
  name: "menu",
  aliases: ["help", "allmenu"],
  category: "tools",
  description: "Show the bot command menu",
  async execute(ctx) {
    const requested = ctx.rawArgs[0]?.toLowerCase();
    const category = parseCategory(requested);

    if (requested && !category) {
      await ctx.send.text(
        `Kategori tidak ditemukan. Pilihan: ${CATEGORIES.join(", ")}.\nContoh: .menu tools`,
      );
      return;
    }

    const sections = category
      ? [MENU[category]]
      : CATEGORIES.map((key) => MENU[key]);

    await ctx.send.interactive.singleSelect({
      title: "violajs Menu",
      body: category
        ? `Daftar perintah kategori ${category}. Pilih perintah untuk menjalankannya.`
        : "Pilih perintah dari daftar di bawah ini. Ketuk salah satu item untuk menjalankannya.",
      footer: "violajs · command menu",
      selectLabel: "Pilih perintah",
      sections,
    });
  },
});
