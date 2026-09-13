import makeWASocket, { DisconnectReason, type WASocket } from "baileys";
import { useSQLiteAuthState } from "../storage/auth";
import https from "https";
import qrcode from "qrcode";
import { MemoryMediaCache } from "../storage/cache";
import pino from "pino";

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
    logger: pino({
      level: "info",
    }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on(
    "connection.update",
    async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        console.log(
          await qrcode.toString(qr, { small: true, type: "terminal" }),
        );
      }

      if (connection === "open") {
        console.log("WhatsApp connected");
        return;
      }

      if (connection === "close") {
        const statusCode = (
          lastDisconnect?.error as
            { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
          console.log("Connection closed:", statusCode ?? "unknown");
        } else {
          console.log("Logged out; delete session and pair again.");
        }
      }
    },
  );

  return sock;
};
