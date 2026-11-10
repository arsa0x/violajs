import { describe, expect, test } from "bun:test";
import type { CommandContext } from "@core/context";
import { groupAdminOnly } from "@middlewares/group-admin";
import { botAdminOnly } from "@middlewares/bot-admin";

function mockContext(
  participants: Array<{ id: string; admin?: string | null }>,
  senderJid = "628111111111@s.whatsapp.net",
) {
  const sent: string[] = [];
  const ctx = {
    chat: { jid: "120363000000000000@g.us", isGroup: true },
    sender: { jid: senderJid, isOwner: false },
    sock: {
      user: { id: "628222222222:4@s.whatsapp.net" },
      groupMetadata: async () => ({ participants }),
    },
    send: {
      text: async (text: string) => {
        sent.push(text);
      },
    },
    log: { error: () => {} },
  } as unknown as CommandContext;

  return { ctx, sent };
}

describe("group permission middleware", () => {
  test("allows a group admin", async () => {
    const { ctx, sent } = mockContext([
      { id: "628111111111@s.whatsapp.net", admin: "admin" },
      { id: "628222222222@s.whatsapp.net", admin: "superadmin" },
    ]);
    let called = false;
    await groupAdminOnly()(ctx, async () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(sent).toHaveLength(0);
  });

  test("blocks a regular group member", async () => {
    const { ctx, sent } = mockContext([
      { id: "628111111111@s.whatsapp.net", admin: null },
      { id: "628222222222@s.whatsapp.net", admin: "superadmin" },
    ]);
    let called = false;
    await groupAdminOnly()(ctx, async () => {
      called = true;
    });
    expect(called).toBe(false);
    expect(sent[0]).toContain("admin grup");
  });

  test("blocks commands if the bot is not a group admin", async () => {
    const { ctx, sent } = mockContext([
      { id: "628111111111@s.whatsapp.net", admin: "admin" },
      { id: "628222222222@s.whatsapp.net", admin: null },
    ]);
    let called = false;
    await botAdminOnly()(ctx, async () => {
      called = true;
    });
    expect(called).toBe(false);
    expect(sent[0]).toContain("Bot harus menjadi admin");
  });
});
