import pino from "pino";
import { makeWASocket } from "baileys";
import https from "https";
import { MemoryMediaCache } from "./cache/media";
import type { Config } from "./types";
import type { Manager } from "./manager";
import { useSQLiteAuthState } from "./auth";

export const customFetchAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 60_000,
});

const mediaCacheStore = new MemoryMediaCache(1000);

const { saveCreds, state } = await useSQLiteAuthState(
  "./session/auth_state.sqlite",
);

export async function start(manager: Manager, config: Config) {
  const sock = makeWASocket({
    auth: state,
    logger: pino({
      level: "error",
    }),
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    fetchAgent: customFetchAgent,
    mediaCache: mediaCacheStore,
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

      if (connection === "close") {
        if (
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.cause
        ) {
          console.error(lastDisconnect.error.cause);
        } else {
          await start(manager, config);
        }
      }

      if (connection === "open") {
        console.log("[info] Connected");
      }
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
          msg,
        },
        cmd,
      );
    }
  });
}
