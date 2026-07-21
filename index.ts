import { makeWASocket } from "baileys";
import pino from "pino";
import type { Config } from "./src/types";
import { useSQLiteAuthState } from "./src/auth";

async function main() {
  const manager = new (await import("./src/manager")).Manager();
  const { state, saveCreds } = useSQLiteAuthState("./session/auth_state.sqlite");

  await manager.load();
  const config: Config = await Bun.file("./config.json").json();

  const sock = makeWASocket({
    auth: state,
    logger: pino(),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on(
    "connection.update",
    async ({ qr, lastDisconnect, connection }) => {
      if (qr)
        console.log(
          await (
            await import("qrcode")
          ).toString(qr, {
            small: true,
            type: "terminal",
          }),
        );
    },
  );

  sock.ev.on("messages.upsert", async ({ messages, type, requestId }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const text = manager.getTextContent(msg.message);
      const jid = msg.key.remoteJid;

      if (!text || !text.startsWith(config.prefix)) continue;
      if (!jid) continue;

      const parts = text.trim().split(/ +/);
      const cmd = parts[0]!.slice(1).toLowerCase();

      await manager.dispatch(
        {
          args: parts,
          jid: jid,
          sock,
        },
        cmd,
      );
    }
  });
}

void (await main());
