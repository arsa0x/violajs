import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  downloadMediaMessage,
  generateWAMessage,
  prepareWAMessageMedia,
  proto,
  type WAMessage,
  type WASocket,
} from "baileys";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 950_000;
const MAX_DURATION_SECONDS = 10;
const AUDIO_MIMETYPE = "audio/ogg; codecs=opus";
const PATCHED = Symbol.for("violajs.audioStickerCodec");
const pending = new WeakMap<object, { audio: Uint8Array; emoji: string }>();
const pendingByHash = new Map<string, { audio: Uint8Array; emoji: string; at: number }>();

type SocketInternals = WASocket & {
  waUploadToServer: (...args: any[]) => Promise<any>;
  logger?: any;
  authState?: { creds?: { me?: { id?: string } } };
};

type MediaSource = {
  message: WAMessage;
  video: NonNullable<ReturnType<typeof getVideoMessage>>;
};

function getVideoMessage(message: any) {
  return message?.videoMessage;
}

function cloneOmitting<T extends object>(value: T, omitted: Set<string>): T {
  const clone = Object.create(Object.getPrototypeOf(value) ?? Object.prototype);
  for (const key of Object.keys(value)) {
    if (!omitted.has(key)) clone[key] = (value as any)[key];
  }
  return clone;
}

function hashKey(sticker: any): string | undefined {
  const hash = sticker?.fileEncSha256;
  return hash ? Buffer.from(hash).toString("hex") : undefined;
}

function findPending(sticker: any) {
  const direct = sticker && pending.get(sticker);
  if (direct) return direct;

  const key = hashKey(sticker);
  if (!key) return undefined;

  const cached = pendingByHash.get(key);
  if (!cached) return undefined;
  if (Date.now() - cached.at > 10 * 60_000) {
    pendingByHash.delete(key);
    return undefined;
  }
  return cached;
}

/**
 * Baileys 7.0.0-rc14 does not yet encode WhatsApp's audioStickerMessage
 * envelope (Message field 134). Extend the encoder at runtime without
 * modifying node_modules. The ordinary stickerMessage remains visible to
 * Baileys' message sender so it still uses the sticker media upload path.
 */
function installAudioStickerCodec(): void {
  const messageProto = (proto as any).Message;
  if (!messageProto || messageProto[PATCHED]) return;

  const originalEncode = messageProto.encode;
  messageProto.encode = function encodeWithAudioSticker(message: any, writer?: any) {
    const sticker = message?.stickerMessage;
    const attachment = sticker ? findPending(sticker) : undefined;
    if (!sticker || !attachment) {
      return originalEncode.call(this, message, writer);
    }

    const outer = cloneOmitting(
      message,
      new Set(["stickerMessage", "audioStickerMessage"]),
    );
    const output = originalEncode.call(this, outer, writer);

    // Message.audioStickerMessage (134)
    output.uint32((134 << 3) | 2).fork();
    // FutureProofMessage.message (1)
    output.uint32((1 << 3) | 2).fork();
    // Message.stickerMessage (26)
    output.uint32((26 << 3) | 2).fork();

    const cleanSticker = cloneOmitting(
      sticker,
      new Set(["premium", "emojis", "audioMessage"]),
    );
    messageProto.StickerMessage.encode(cleanSticker, output);

    // StickerMessage.premium (24), emojis (25), audioMessage (26).
    output.uint32(24 << 3).uint32(0);
    output.uint32((25 << 3) | 2).string(attachment.emoji);
    output.uint32((26 << 3) | 2).bytes(attachment.audio);

    output.ldelim();
    output.ldelim();
    output.ldelim();
    return output;
  };

  Object.defineProperty(messageProto, PATCHED, {
    value: true,
    enumerable: false,
  });
}

function registerAudio(sticker: object, audio: Uint8Array): void {
  const attachment = { audio, emoji: "🔊" };
  pending.set(sticker, attachment);

  const key = hashKey(sticker);
  if (key) {
    pendingByHash.set(key, { ...attachment, at: Date.now() });
    if (pendingByHash.size > 256) {
      const oldest = pendingByHash.keys().next().value;
      if (oldest) pendingByHash.delete(oldest);
    }
  }
}

async function run(
  command: string,
  args: string[],
  timeoutMs = 60_000,
): Promise<string> {
  const process = Bun.spawn([command, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    signal: AbortSignal.timeout(timeoutMs),
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode !== 0) {
    throw new Error(
      `${command} exited with code ${exitCode}: ${stderr.trim().slice(-1200)}`,
    );
  }
  return stdout.trim();
}

function makeChunk(name: string, data: Uint8Array): Buffer {
  const payload = Buffer.from(data);
  const header = Buffer.alloc(8);
  header.write(name, 0, "ascii");
  header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([
    header,
    payload,
    payload.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0),
  ]);
}

function buildExif(packName: string, publisher: string, audio: Uint8Array): Buffer {
  const metadata = Buffer.from(
    JSON.stringify({
      "sticker-pack-id": "violajs-audio-sticker",
      "sticker-pack-name": packName,
      "sticker-pack-publisher": publisher,
      emojis: ["🔊"],
      "sound-sha256": createHash("sha256").update(audio).digest("base64"),
    }),
    "utf8",
  );

  // Big-endian TIFF header with WhatsApp's 0x5741 ("WA") EXIF tag.
  const header = Buffer.alloc(26);
  header.write("MM", 0, "ascii");
  header.writeUInt16BE(42, 2);
  header.writeUInt32BE(8, 4);
  header.writeUInt16BE(1, 8);
  header.writeUInt16BE(0x5741, 10);
  header.writeUInt16BE(7, 12);
  header.writeUInt32BE(metadata.length, 14);
  header.writeUInt32BE(26, 18);
  header.writeUInt32BE(0, 22);
  return Buffer.concat([header, metadata]);
}

function addSoundExif(webp: Buffer, exif: Buffer): Buffer {
  if (
    webp.length < 12 ||
    webp.toString("ascii", 0, 4) !== "RIFF" ||
    webp.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("FFmpeg did not produce a valid WebP file.");
  }

  const chunks: Array<{ name: string; data: Buffer }> = [];
  for (let offset = 12; offset + 8 <= webp.length;) {
    const name = webp.toString("ascii", offset, offset + 4);
    const size = webp.readUInt32LE(offset + 4);
    const end = offset + 8 + size;
    if (end > webp.length) throw new Error("WebP contains a truncated chunk.");
    chunks.push({ name, data: webp.subarray(offset + 8, end) });
    offset = end + (size & 1);
  }

  const vp8xIndex = chunks.findIndex((chunk) => chunk.name === "VP8X");
  if (vp8xIndex < 0) {
    throw new Error("Animated WebP is missing its VP8X header.");
  }

  const vp8x = Buffer.from(chunks[vp8xIndex]!.data);
  if (vp8x.length < 10) throw new Error("Invalid WebP VP8X header.");
  vp8x[0]! |= 0x08; // EXIF metadata flag.
  chunks[vp8xIndex] = { name: "VP8X", data: vp8x };

  const body = Buffer.concat([
    ...chunks
      .filter((chunk) => chunk.name !== "EXIF")
      .map((chunk) => makeChunk(chunk.name, chunk.data)),
    makeChunk("EXIF", exif),
  ]);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(4 + body.length, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, body]);
}

async function createVideoSticker(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number,
): Promise<Buffer> {
  const profiles = [
    { fps: 15, side: 512, quality: 65 },
    { fps: 12, side: 512, quality: 55 },
    { fps: 12, side: 384, quality: 45 },
    { fps: 10, side: 320, quality: 35 },
  ];

  for (const profile of profiles) {
    const filter = [
      `fps=${profile.fps}`,
      `scale=${profile.side}:${profile.side}:force_original_aspect_ratio=decrease`,
      `pad=${profile.side}:${profile.side}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`,
      "format=rgba",
    ].join(",");

    const args = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", startSeconds.toFixed(3),
      "-i", inputPath,
      "-t", durationSeconds.toFixed(3),
      "-an",
      "-vf", filter,
      "-c:v", "libwebp_anim",
      "-loop", "0",
      "-q:v", String(profile.quality),
      outputPath,
    ];
    await run("ffmpeg", args);
    const output = await readFile(outputPath);
    if (output.length <= MAX_OUTPUT_BYTES) return output;
  }

  throw new Error("Video is too large to fit WhatsApp's animated sticker limit.");
}

export async function sendAudioSticker(
  sock: WASocket,
  jid: string,
  source: WAMessage,
  options: {
    quoted?: WAMessage;
    startSeconds?: number;
    durationSeconds?: number;
    packName?: string;
    publisher?: string;
  } = {},
): Promise<void> {
  const socket = sock as SocketInternals;
  if (!socket.waUploadToServer) {
    throw new Error("This Baileys socket does not expose waUploadToServer.");
  }

  installAudioStickerCodec();

  const directory = await mkdtemp(join(tmpdir(), "violajs-audio-sticker-"));
  const inputPath = join(directory, "input-video");
  const webpPath = join(directory, "sticker.webp");
  const audioPath = join(directory, "audio.ogg");

  try {
    const input = await downloadMediaMessage(source, "buffer", {});
    if (!input.length || input.length > MAX_INPUT_BYTES) {
      throw new Error("Video must be smaller than 25 MB.");
    }
    await writeFile(inputPath, input);

    const durationText = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ], 15_000);
    const totalDuration = Number(durationText);
    if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
      throw new Error("Unable to read the video's duration.");
    }

    const audioStream = await run("ffprobe", [
      "-v", "error",
      "-select_streams", "a:0",
      "-show_entries", "stream=codec_type",
      "-of", "csv=p=0",
      inputPath,
    ], 15_000);
    if (!audioStream.includes("audio")) {
      throw new Error("The selected video does not contain an audio track.");
    }

    const startSeconds = Math.max(0, options.startSeconds ?? 0);
    if (startSeconds >= totalDuration) {
      throw new Error("Start time is beyond the end of the video.");
    }

    const requestedDuration = options.durationSeconds ?? MAX_DURATION_SECONDS;
    if (!Number.isFinite(requestedDuration) || requestedDuration <= 0) {
      throw new Error("Duration must be a positive number.");
    }
    const durationSeconds = Math.min(
      requestedDuration,
      MAX_DURATION_SECONDS,
      totalDuration - startSeconds,
    );

    const audioArgs = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", startSeconds.toFixed(3),
      "-i", inputPath,
      "-t", durationSeconds.toFixed(3),
      "-vn", "-map", "0:a:0",
      "-ar", "48000", "-ac", "1",
      "-c:a", "libopus", "-b:a", "24k", "-vbr", "on",
      "-application", "audio",
      "-f", "ogg", audioPath,
    ];
    await run("ffmpeg", audioArgs);

    const audioBuffer = await readFile(audioPath);
    if (!audioBuffer.length || audioBuffer.length > MAX_OUTPUT_BYTES) {
      throw new Error("Audio is too large for a WhatsApp sound sticker.");
    }

    const rawWebp = await createVideoSticker(
      inputPath,
      webpPath,
      startSeconds,
      durationSeconds,
    );
    const webpBuffer = addSoundExif(
      rawWebp,
      buildExif(
        options.packName ?? "Violajs",
        options.publisher ?? "Generated by violajs",
        audioBuffer,
      ),
    );

    const userJid = socket.user?.id ?? socket.authState?.creds?.me?.id;
    if (!userJid) throw new Error("Unable to determine the bot's WhatsApp JID.");

    const preparedAudio = await prepareWAMessageMedia(
      {
        audio: audioBuffer,
        mimetype: AUDIO_MIMETYPE,
        ptt: false,
        seconds: Math.max(1, Math.round(durationSeconds)),
      },
      {
        upload: socket.waUploadToServer,
        logger: socket.logger,
        jid,
      },
    );

    const audioMessage = preparedAudio.audioMessage;
    if (!audioMessage) throw new Error("Failed to prepare the sticker audio.");
    const audioBytes = proto.Message.AudioMessage.encode(audioMessage).finish();

    const generated = await generateWAMessage(
      jid,
      {
        sticker: webpBuffer,
        mimetype: "image/webp",
        isAnimated: true,
        width: 512,
        height: 512,
      },
      {
        userJid,
        upload: socket.waUploadToServer,
        logger: socket.logger,
        quoted: options.quoted,
      },
    );

    const stickerMessage = generated.message?.stickerMessage;
    if (!stickerMessage) throw new Error("Failed to prepare the sticker message.");

    stickerMessage.stickerSentTs = Date.now();
    registerAudio(stickerMessage, audioBytes);

    await socket.relayMessage(jid, generated.message!, {
      messageId: generated.key.id,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export type { MediaSource };
