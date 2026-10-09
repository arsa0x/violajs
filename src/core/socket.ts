import makeWASocket, { DisconnectReason, type WASocket } from "baileys";
import { useSQLiteAuthState } from "../storage/auth";
import https from "https";
import { qrToString } from "@lib/qr";
import { MemoryMediaCache } from "../storage/cache";
import { log, logger } from "@lib/logger";

const { saveCreds, state } = await useSQLiteAuthState("./session");

export const customFetchAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 60_000,
});

const mediaCacheStore = new MemoryMediaCache(1000);

export const createWAClient: () => Promise<WASocket> = async () => {
  const sock = makeWASocket({
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    fetchAgent: customFetchAgent,
    mediaCache: mediaCacheStore,
    logger,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        log.info(`\n${qrToString(qr)}`);
      }

      if (connection === "open") {
        log.info("WhatsApp connected");
        return;
      }

      if (connection === "close") {
        const statusCode = (
          lastDisconnect?.error as
            { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
          log.error(`Connection closed: ${statusCode ?? "unknown"}`);
        } else {
          log.error("Logged out; delete session and pair again.");
        }
      }
    },
  );

  return sock;
};
