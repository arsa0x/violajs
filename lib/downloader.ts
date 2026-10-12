import { config } from "../config";
import type { Context } from "@core/context";

type JsonObject = Record<string, any>;

const DEFAULT_API_BASE_URL = "https://api.kyzzz.xyz";

export function getInput(ctx: Context): string {
  const direct = ctx.args.join(" ").trim();
  if (direct) return direct;

  const message = ctx.msg.message as any;
  const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage;
  return (
    quoted?.conversation ??
    quoted?.extendedTextMessage?.text ??
    quoted?.imageMessage?.caption ??
    quoted?.videoMessage?.caption ??
    quoted?.documentMessage?.caption ??
    ""
  ).trim();
}

export function requireUrl(input: string, allowedHosts: string[]): string {
  const match = input.match(/https?:\/\/[^\s<>"']+/i);
  const candidate = (match?.[0] ?? input).replace(/[),.!?]+$/, "");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Masukkan URL yang valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("URL harus menggunakan HTTP atau HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  const allowed = allowedHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
  if (!allowed) {
    throw new Error(`Domain tidak didukung. Gunakan: ${allowedHosts.join(", ")}.`);
  }

  return url.href;
}

export async function apiGet(
  endpoint: string,
  params: Record<string, string>,
  timeoutMs = 25_000,
): Promise<JsonObject> {
  const baseUrl =
    config.downloaderApiBaseUrl ??
    process.env.DOWNLOADER_API_BASE_URL ??
    DEFAULT_API_BASE_URL;
  const apiUrl = new URL(endpoint.replace(/^\/+/, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);

  for (const [key, value] of Object.entries(params)) {
    apiUrl.searchParams.set(key, value);
  }

  const apiKey = config.downloaderApiKey ?? process.env.DOWNLOADER_API_KEY;
  if (apiKey) apiUrl.searchParams.set("apikey", apiKey);

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ViolaJS-Downloader/1.0",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Downloader API merespons HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object") {
    throw new Error("Respons Downloader API tidak valid.");
  }

  return data as JsonObject;
}

export async function externalJson(url: string, timeoutMs = 15_000): Promise<JsonObject> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object") throw new Error("Respons API tidak valid.");
  return data as JsonObject;
}

export function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

export function safeFileName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return (cleaned || fallback).slice(0, 180);
}

export async function sendVideo(ctx: Context, url: string, caption: string): Promise<void> {
  await ctx.sock.sendMessage(
    ctx.chat.jid,
    { video: { url }, caption, mimetype: "video/mp4" },
    { quoted: ctx.msg },
  );
}

export async function sendImage(ctx: Context, url: string, caption: string): Promise<void> {
  await ctx.sock.sendMessage(
    ctx.chat.jid,
    { image: { url }, caption },
    { quoted: ctx.msg },
  );
}

export async function sendAudio(
  ctx: Context,
  url: string,
  fileName = "audio.mp3",
  mimetype = "audio/mpeg",
): Promise<void> {
  await ctx.sock.sendMessage(
    ctx.chat.jid,
    { audio: { url }, mimetype, fileName, ptt: false },
    { quoted: ctx.msg },
  );
}

export async function sendDocument(
  ctx: Context,
  url: string,
  fileName: string,
  mimetype = "application/octet-stream",
): Promise<void> {
  await ctx.sock.sendMessage(
    ctx.chat.jid,
    { document: { url }, fileName: safeFileName(fileName, "download"), mimetype },
    { quoted: ctx.msg },
  );
}

export async function runDownloader(
  ctx: Context,
  task: () => Promise<void>,
  failureMessage: string,
): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`[DOWNLOADER:${ctx.name}]`, error);
    await ctx.send.text(
      error instanceof Error && (error.message.startsWith("Masukkan URL") || error.message.startsWith("Domain tidak didukung"))
        ? error.message
        : failureMessage,
    );
  }
}
