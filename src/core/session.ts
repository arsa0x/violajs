import makeWASocket, { DisconnectReason, type WASocket } from "baileys";
import { useSQLiteAuthState } from "@src/storage/auth";
import { TtlCache } from "@src/storage/cache";
import { customFetchAgent } from "@core/socket";
import { logger, type Log } from "@lib/logger";
import { qrEncode } from "@lib/qr";
import type { BotOptions } from "@src/cli";
import { config } from "@/config";

const FATAL = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.connectionReplaced,
  DisconnectReason.forbidden,
]);
const MAX_DELAY_MS = 60_000;
const OWNED_EVENTS = [
  "connection.update",
  "creds.update",
  "messages.upsert",
  "group-participants.update",
  "groups.update",
] as const;

export const groupCaches = new WeakMap<WASocket, TtlCache>();

export class Session {
  sock!: WASocket;
  private stopped = false;
  private attempts = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private pairingRequested = false;
  private auth?: Awaited<ReturnType<typeof useSQLiteAuthState>>;
  private readonly groupCache = new TtlCache(500, 5 * 60_000);
  private readonly retryCache = new TtlCache(5_000, 10 * 60_000);
  private readonly binders: Array<(sock: WASocket) => void> = [];

  constructor(
    readonly name: string,
    private readonly log: Log,
    private readonly options?: BotOptions,
  ) {}

  bind(fn: (sock: WASocket) => void): void {
    this.binders.push(fn);
    if (this.sock) fn(this.sock);
  }

  async start(): Promise<void> {
    this.auth ??= await useSQLiteAuthState(
      `${config.session_path}/${this.name}`,
    );
    this.open();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    this.teardown();
    this.auth?.close();
  }

  private open(): void {
    if (this.stopped) return;
    this.teardown();
    const auth = this.auth!;

    const sock = makeWASocket({
      auth: auth.state,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      fetchAgent: customFetchAgent,
      logger: logger(this.log),
      msgRetryCounterCache: this.retryCache,
      cachedGroupMetadata: async (jid) => this.groupCache.get(jid),
    });
    this.sock = sock;
    groupCaches.set(sock, this.groupCache);

    sock.ev.on("creds.update", auth.saveCreds);
    sock.ev.on("groups.update", (updates) => {
      for (const g of updates) if (g.id) this.groupCache.del(g.id);
    });
    sock.ev.on("group-participants.update", ({ id }) =>
      this.groupCache.del(id),
    );
    sock.ev.on("connection.update", (update) => {
      this.onConnection(sock, update).catch((e) =>
        this.log.error("connection.update handler failed:", e),
      );
    });

    for (const fn of this.binders) fn(sock);
  }

  private teardown(): void {
    const old = this.sock;
    if (!old) return;
    for (const ev of OWNED_EVENTS) old.ev.removeAllListeners(ev);
    try {
      old.end(undefined);
    } catch {
      /* already closed */
    }
  }

  private async onConnection(
    sock: WASocket,
    u: {
      connection?: string;
      lastDisconnect?: { error?: unknown };
      qr?: string;
    },
  ): Promise<void> {
    if (sock !== this.sock) return;

    if (u.qr) {
      if (this.options?.pairing && !sock.authState.creds.registered) {
        if (!this.pairingRequested) {
          this.pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(
              this.options.phone!,
              "VIOLATSC",
            );
            this.log.info("Pairing code:", code);
          } catch (e) {
            this.pairingRequested = false;
            this.log.error("Pairing request failed:", e);
          }
        }
      } else {
        this.log.info("\n", qrEncode(u.qr));
      }
    }

    if (u.connection === "open") {
      this.attempts = 0;
      this.pairingRequested = false;
      this.log.info("WhatsApp connected");
      return;
    }
    if (u.connection !== "close") return;

    const code = (
      u.lastDisconnect?.error as
        { output?: { statusCode?: number } } | undefined
    )?.output?.statusCode;

    if (code === DisconnectReason.loggedOut) {
      this.log.error("Logged out. Credentials cleared; restart to pair again.");
      this.auth?.clearAll();
      this.stopped = true;
      return;
    }
    if (code !== undefined && FATAL.has(code)) {
      this.log.error(`Fatal disconnect (${code}); not reconnecting.`);
      this.stopped = true;
      return;
    }

    const delay =
      code === DisconnectReason.restartRequired
        ? 0
        : Math.min(MAX_DELAY_MS, 1_000 * 2 ** this.attempts++) +
          Math.random() * 1_000;
    this.log.warn(
      `Connection closed (${code ?? "unknown"}); retry in ${Math.round(delay)}ms`,
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(), delay);
  }
}
