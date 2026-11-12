import { defineCommand } from "@core/command";
import { qrEncode } from "@lib/qr";

export default defineCommand({
  name: "qr",
  aliases: ["qrcode"],
  category: "tools",
  description: "Generate a text QR code",
  async execute(ctx) {
    const value = ctx.rawArgs.join(" ").trim();
    if (!value) {
      await ctx.send.text("Penggunaan: .qr <teks atau URL>");
      return;
    }
    if (value.length > 250) {
      await ctx.send.text(
        "Teks terlalu panjang untuk dikirim sebagai QR teks (maksimal 250 karakter).",
      );
      return;
    }

    const code = qrEncode(value);
    if (!code) {
      await ctx.send.text("Teks tidak dapat dikodekan menjadi QR.");
      return;
    }

    await ctx.send.text(`QR untuk: ${value}\n\n${code}`);
  },
});
