import { defineCommand } from "@core/command";
import type { InteractiveSelectSection } from "@lib/interactive";
import type { Category } from "../../src/types/command";
import { MENU } from "src/generated/menu";

const CATEGORIES = Object.keys(MENU) as Category[];

function parseCategory(value: string | undefined): Category | undefined {
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
