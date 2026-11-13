# 11 — Worked Examples

Three complete, production-ready plugins from scratch.

---

## Example 1 — `weather` command

Fetches live weather data, uses a `--unit` flag, has a cooldown, and sends an interactive
URL button. Shows the full flow: guard → reaction → fetch → error handling → reply.

```ts
// commands/tools/weather.ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";
import { cooldown } from "@src/middlewares/cooldown";

const UNIT = FlagSpec.value(["--unit", "-u"]).description(
  "Unit: metric (default) | imperial.",
);

type WeatherResponse = {
  name: string;
  main: { temp: number; humidity: number };
  weather: Array<{ description: string }>;
};

async function fetchWeather(
  city: string,
  unit: string,
): Promise<WeatherResponse> {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("q", city);
  url.searchParams.set("units", unit);
  url.searchParams.set("appid", process.env.OWM_API_KEY ?? "");

  const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(`API error: HTTP ${res.status}`);
  return res.json() as Promise<WeatherResponse>;
}

export default defineCommand({
  name: "weather",
  aliases: ["cuaca", "wx"],
  category: "tools",
  description: "Get current weather for a city.",
  usage: [".weather Jakarta", ".weather London --unit imperial"],
  flags: [UNIT],
  middleware: [cooldown(10_000)],

  async execute(ctx) {
    const city = ctx.args!.rest().join(" ");
    if (!city) {
      await ctx.send.text("Usage: .weather <city>  e.g. .weather Jakarta");
      return;
    }

    const unit = ctx.args!.value("--unit") ?? "metric";
    const degree = unit === "imperial" ? "°F" : "°C";

    await ctx.send.reaction("⏳");

    let data: WeatherResponse;
    try {
      data = await fetchWeather(city, unit);
    } catch (error) {
      ctx.log.error("Weather fetch failed:", error);
      await ctx.send.reaction("❌");
      await ctx.send.text(
        `Could not fetch weather for "${city}". Try again later.`,
      );
      return;
    }

    await ctx.send.reaction("✅");

    const desc = data.weather[0]?.description ?? "unknown";
    const body = [
      `🌤 *${data.name}*`,
      `Temp:     ${data.main.temp}${degree}`,
      `Humidity: ${data.main.humidity}%`,
      `Condition: ${desc}`,
    ].join("\n");

    await ctx.send.interactive.urlButton({
      body,
      text: "Full Forecast",
      url: `https://openweathermap.org/find?q=${encodeURIComponent(city)}`,
      footer: "violajs weather",
    });
  },
});
```

---

## Example 2 — `group-lifecycle` event plugin

Welcomes new members with a mention, announces departures, logs every inbound message,
and notifies on reconnect.

```ts
// events/group.ts
import { defineEvent } from "@core/event";

export default defineEvent({
  name: "group-lifecycle",

  events: {
    // ── Welcome new members ─────────────────────────────────────────────
    "group.participant.join": async (ctx) => {
      const { groupJid, participants } = ctx.event;

      let groupName = groupJid;
      try {
        const meta = await ctx.sock.groupMetadata(groupJid);
        groupName = meta.subject;
      } catch {
        // groupMetadata can fail right after the bot itself is added; degrade gracefully
      }

      for (const jid of participants) {
        const phone = jid.split("@")[0];
        await ctx.sock.sendMessage(groupJid, {
          text: [
            `👋 Welcome to *${groupName}*, @${phone}!`,
            "Type *.help* to see the available commands.",
          ].join("\n"),
          mentions: [jid],
        });
      }
    },

    // ── Farewell departing members ──────────────────────────────────────
    "group.participant.leave": async (ctx) => {
      const { groupJid, participants } = ctx.event;
      const count = participants.length;
      await ctx.sock.sendMessage(groupJid, {
        text: `👋 ${count} member${count === 1 ? "" : "s"} left the group.`,
      });
    },

    // ── Log every inbound message (debug) ──────────────────────────────
    "message.received": async (ctx) => {
      const { chat, sender, text } = ctx.event;
      if (!text) return;
      ctx.log.debug(
        `[${chat.isGroup ? "group" : "dm"}] ${sender.jid}: ${text.slice(0, 80)}`,
      );
    },

    // ── Log reconnects ─────────────────────────────────────────────────
    "connection.open": async (ctx) => {
      ctx.log.info(`Bot connected as ${ctx.event.userJid}`);
    },
  },
});
```

---

## Example 3 — `remind` command (stateful with `dispose`)

Shows how to manage long-lived timers across hot-reloads correctly.

```ts
// commands/tools/remind.ts
import { defineCommand } from "@core/command";
import { FlagSpec } from "@lib/args";

const IN = FlagSpec.value(["--in", "-i"]).description(
  "Delay in seconds (default 60).",
);

// Module-level state: persists for the lifetime of this module version.
// Always cleared in dispose() so hot-reload is clean.
const timers = new Set<ReturnType<typeof setTimeout>>();

export default defineCommand({
  name: "remind",
  aliases: ["reminder"],
  category: "tools",
  description: "Set a personal reminder.",
  usage: [".remind Buy groceries --in 300", ".remind Stand up! --in 3600"],
  flags: [IN],

  async execute(ctx) {
    const message = ctx.args!.rest().join(" ");
    if (!message) {
      await ctx.send.text("Usage: .remind <message> --in <seconds>");
      return;
    }

    const seconds = ctx.args!.valueParsed("--in", Number) ?? 60;
    if (!Number.isFinite(seconds) || seconds <= 0) {
      await ctx.send.text("Invalid delay. Use a positive number of seconds.");
      return;
    }

    // Capture the socket and JID now — ctx may be GC'd before the timer fires.
    const { jid } = ctx.chat;
    const sock = ctx.sock;

    const t = setTimeout(async () => {
      timers.delete(t);
      await sock.sendMessage(jid, { text: `⏰ Reminder: ${message}` });
    }, seconds * 1_000);

    timers.add(t);
    await ctx.send.text(
      `⏰ Got it! I'll remind you in ${seconds}s:\n"${message}"`,
    );
  },

  // Called by the hot-reload loader before this module is replaced.
  // Without this, timers from the old module version keep firing.
  dispose() {
    for (const t of timers) clearTimeout(t);
    timers.clear();
  },
});
```

---

## Example 4 — `poll` command (interactive buttons + response handling)

Sends a quick-reply poll and handles the reply in the same event plugin.

```ts
// commands/tools/poll.ts
import { defineCommand } from "@core/command";

export default defineCommand({
  name: "poll",
  category: "tools",
  description: "Create a quick 2-option poll.",
  usage: ['.poll "Option A" "Option B"'],

  async execute(ctx) {
    const [optA, optB] = ctx.args!.rest();
    if (!optA || !optB) {
      await ctx.send.text('Usage: .poll "Option A" "Option B"');
      return;
    }

    await ctx.send.interactive.quickReply({
      body: `📊 *Poll*\nVote by tapping a button:`,
      footer: `Posted by ${ctx.sender.jid.split("@")[0]}`,
      buttons: [
        { text: optA, id: `poll:a:${optA}` },
        { text: optB, id: `poll:b:${optB}` },
      ],
      quoted: false,
    });
  },
});
```

```ts
// events/poll-response.ts
import { defineEvent } from "@core/event";
import { extractInteractiveResponse } from "@lib/interactive";

export default defineEvent({
  name: "poll-response",
  events: {
    "message.received": async (ctx) => {
      const { message } = ctx.event;
      const id = extractInteractiveResponse(message);
      if (!id?.startsWith("poll:")) return;

      const [, choice, option] = id.split(":");
      const voter = ctx.event.sender.jid.split("@")[0];

      await ctx.sock.sendMessage(ctx.event.chat.jid, {
        text: `✅ @${voter} voted for *${option}*!`,
        mentions: [ctx.event.sender.jid],
      });
    },
  },
});
```
