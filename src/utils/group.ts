import type { Context } from "@core/context";

export function getGroupMentions(ctx: Context): string[] {
  const message = ctx.msg.message;
  const contextInfo =
    message?.extendedTextMessage?.contextInfo ??
    message?.imageMessage?.contextInfo ??
    message?.videoMessage?.contextInfo;
  return (contextInfo?.mentionedJid ?? []).filter(
    (jid): jid is string => typeof jid === "string",
  );
}

export function getGroupTarget(ctx: Context): string | undefined {
  const mention = getGroupMentions(ctx)[0];
  if (mention) return mention;
  const message = ctx.msg.message;
  const contextInfo =
    message?.extendedTextMessage?.contextInfo ??
    message?.imageMessage?.contextInfo ??
    message?.videoMessage?.contextInfo;
  if (contextInfo?.participant) return contextInfo.participant;
  const number = ctx.args[0]?.replace(/\D/g, "");
  if (number && number.length >= 7 && number.length <= 15) {
    return `${number}@s.whatsapp.net`;
  }
  return undefined;
}
