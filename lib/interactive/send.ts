import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  type WAMessage,
  type WASocket,
} from "baileys";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { buildCarouselButtons } from "./carousel-button";
import type {
  InteractiveCallButtonOptions,
  InteractiveCarouselOptions,
  InteractiveCopyCodeOptions,
  InteractiveLocationRequestOptions,
  InteractiveInAppSignupOptions,
  InteractiveQuickReplyOptions,
  InteractiveHeaderMedia,
  InteractiveSingleSelectOptions,
  InteractiveUrlButtonOptions,
} from "./types";
import { log } from "../logger";

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

let fallback: Buffer | undefined;

const getFallback = async () =>
  (fallback ??= Buffer.from(await Bun.file("assets/banner.png").arrayBuffer()));

function assertNonEmpty(value: string, name: string): void {
  if (!value.trim()) {
    throw new TypeError(`Interactive message ${name} cannot be empty.`);
  }
}

function isPrivateIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  if (isIP(v) === 4) {
    const [a, b] = v.split(".").map(Number) as [number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  return (
    v === "::1" ||
    v === "::" ||
    v.startsWith("fc") ||
    v.startsWith("fd") ||
    v.startsWith("fe80")
  );
}

async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TypeError("Media URL must use http or https.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address)))
    throw new Error("Blocked private address");
}

async function readCapped(res: Response, max: number): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new Error("Media too large");
  if (!res.body) throw new Error("Empty body");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new Error("Media too large");
    }
    chunks.push(value);
  }
  if (total === 0) throw new Error("Empty body");
  return Buffer.concat(chunks, total);
}
async function fetchMedia(
  rawUrl: string,
  type: "image" | "video",
): Promise<Buffer> {
  assertNonEmpty(rawUrl, "header media URL");
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS); // one deadline across all hops

  for (let hop = 0; ; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      signal,
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; my-bot/1.0)",
        Accept: `${type}/*`,
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || hop >= MAX_REDIRECTS) throw new Error("Too many redirects");
      url = new URL(loc, url); // re-validated at the top of the loop
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith(`${type}/`))
      throw new Error(`Unexpected content-type "${ct}"`);
    return readCapped(res, MAX_MEDIA_BYTES);
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]!, i);
      }
    }),
  );

  return results;
}

async function resolveMedia(media: InteractiveHeaderMedia) {
  for (const candidate of [media.url, ...(media.fallbackUrls ?? [])]) {
    try {
      return {
        bytes: await fetchMedia(candidate, media.type),
        type: media.type,
        usedFallback: false,
      };
    } catch (error) {
      log.warn(
        `Media fetch failed: ${candidate} -> ${(error as Error).message}`,
      );
    }
  }
  return {
    bytes: await getFallback(),
    type: "image" as const,
    usedFallback: true,
  };
}

async function buildHeader(
  sock: WASocket,
  title: string | undefined,
  media: InteractiveHeaderMedia | undefined,
): Promise<Record<string, unknown>> {
  const headerTitle = title ? { title } : {};
  if (!media) return { ...headerTitle, hasMediaAttachment: false };

  const { bytes, type } = await resolveMedia(media);

  const prepared = await prepareWAMessageMedia(
    type === "image" ? { image: bytes } : { video: bytes },
    { upload: sock.waUploadToServer },
  );

  if (type === "image") {
    if (!prepared.imageMessage)
      throw new Error("Baileys failed to prepare interactive header image.");
    return {
      ...headerTitle,
      imageMessage: prepared.imageMessage,
      hasMediaAttachment: true,
    };
  }

  if (!prepared.videoMessage)
    throw new Error("Baileys failed to prepare interactive header video.");
  return {
    ...headerTitle,
    videoMessage: prepared.videoMessage,
    hasMediaAttachment: true,
  };
}

/**
 * Sends a WhatsApp native-flow message through Baileys' relay API.
 *
 * Native-flow messages are serialized as interactiveMessage inside
 * viewOnceMessage; sock.sendMessage's ordinary text payload cannot represent
 * these buttons by itself.
 */
export async function sendNativeFlow(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  content: Record<string, unknown>,
  quote: boolean,
): Promise<void> {
  const userJid = sock.user?.id;
  if (!userJid) {
    throw new Error(
      "Cannot send an interactive message before WhatsApp is connected.",
    );
  }

  const generated = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: content,
        },
      },
    } as never,
    {
      userJid,
      quoted: quote ? quotedMessage : undefined,
    },
  );

  if (!generated.message || !generated.key.id) {
    throw new Error("Baileys failed to generate the interactive message.");
  }

  const bizNode = {
    tag: "biz",
    attrs: {},
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [
          {
            tag: "native_flow",
            attrs: { v: "9", name: "mixed" },
          },
        ],
      },
    ],
  };

  const additionalNodes = jid.endsWith("@g.us")
    ? [bizNode]
    : [{ tag: "bot", attrs: { biz_bot: "1" } }, bizNode];

  await sock.relayMessage(jid, generated.message, {
    messageId: generated.key.id,
    additionalNodes,
  });
}

/** Sends native-flow quick-reply buttons. */
export async function sendQuickReply(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveQuickReplyOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");

  if (options.buttons.length < 1 || options.buttons.length > 3) {
    throw new RangeError(
      "Quick-reply messages must contain between 1 and 3 buttons.",
    );
  }

  for (const button of options.buttons) {
    assertNonEmpty(button.text, "button text");
    assertNonEmpty(button.id, "button id");
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: options.buttons.map((button) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            id: button.id,
          }),
        })),
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a native-flow single-select list with one or more sections. */
export async function sendSingleSelect(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveSingleSelectOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.selectLabel ?? "Choose", "select label");

  if (options.sections.length === 0) {
    throw new RangeError(
      "Single-select messages must contain at least one section.",
    );
  }

  for (const section of options.sections) {
    for (const row of section.rows) {
      assertNonEmpty(row.title, "row title");
      assertNonEmpty(row.id, "row id");
    }
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: options.selectLabel ?? "Choose",
              sections: options.sections.map((section) => ({
                title: section.title,
                rows: section.rows.map((row) => ({
                  title: row.title,
                  id: row.id,
                  ...(row.description ? { description: row.description } : {}),
                })),
              })),
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a button that opens a URL. */
export async function sendUrlButton(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveUrlButtonOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.text, "URL button text");
  assertNonEmpty(options.url, "URL");
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(options.url);
  } catch {
    throw new TypeError("Interactive URL must be a valid absolute URL.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new TypeError("Interactive URL must use http or https.");
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: options.text,
              url: parsedUrl.toString(),
              ...(options.merchantUrl
                ? { merchant_url: options.merchantUrl }
                : {}),
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a button that starts a phone call. */
export async function sendCallButton(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveCallButtonOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.text, "call button text");
  assertNonEmpty(options.phoneNumber, "phone number");
  if (!/^\+?[0-9][0-9 ()-]{3,19}$/.test(options.phoneNumber)) {
    throw new TypeError(
      "Phone number must contain a valid international-style number.",
    );
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_call",
            buttonParamsJson: JSON.stringify({
              display_text: options.text,
              phone_number: options.phoneNumber,
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a button that lets the recipient copy a code. */
export async function sendCopyCode(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveCopyCodeOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.text, "copy button text");
  assertNonEmpty(options.code, "code");

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: options.text,
              copy_code: options.code,
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends an in-app signup native-flow button. Client/account support may vary. */
export async function sendInAppSignup(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveInAppSignupOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          { name: "inapp_signup", buttonParamsJson: JSON.stringify({}) },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a native-flow button that asks the recipient to share their location. */
export async function sendLocationRequest(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveLocationRequestOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.text, "location button text");

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: await buildHeader(sock, options.title, options.headerMedia),
      nativeFlowMessage: {
        buttons: [
          {
            name: "send_location",
            buttonParamsJson: JSON.stringify({
              display_text: options.text,
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a native WhatsApp carousel with image cards and consistent CTA buttons. */
export async function sendCarousel(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveCarouselOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");

  if (options.cards.length < 2) {
    throw new RangeError("Carousel messages must contain at least 2 cards.");
  }

  const cards = await mapLimit(options.cards, 4, async (card, index) => {
    assertNonEmpty(card.title, `card ${index + 1} title`);

    const cardButtons = card.buttons ?? (card.button ? [card.button] : []);
    if (cardButtons.length === 0) {
      throw new RangeError(
        `Carousel card ${index + 1} must contain at least one button.`,
      );
    }

    const { bytes } = await resolveMedia({
      type: "image",
      url: card.image,
      fallbackUrls: card.imageFallbacks,
    });

    const buttons = buildCarouselButtons(cardButtons, index + 1);
    const media = await prepareWAMessageMedia(
      { image: bytes },
      { upload: sock.waUploadToServer },
    );

    if (!media.imageMessage) {
      throw new Error(
        `Baileys failed to prepare image for carousel card ${index + 1}.`,
      );
    }

    return {
      header: {
        imageMessage: media.imageMessage,
        hasMediaAttachment: true,
      },
      body: {
        text: card.body?.trim()
          ? `${card.title}\n${card.body.trim()}`
          : card.title,
      },
      ...(card.footer ? { footer: { text: card.footer } } : {}),
      nativeFlowMessage: {
        buttons,
        messageParamsJson: "",
      },
    };
  });
  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      carouselMessage: { cards },
    },
    options.quoted ?? true,
  );
}
