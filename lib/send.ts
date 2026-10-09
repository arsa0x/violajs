import type { MimeType } from "../src/types/mime";
import type { WAMediaUpload, WAMessage, WASocket } from "baileys";

export class Send {
  constructor(
    private readonly sock: WASocket,
    private readonly msg: WAMessage,
    private readonly jid: string,
  ) {}

  async text(body: string | string[], reply: boolean = true) {
    const text = Array.isArray(body) ? body.join("") : body;

    await this.sock.sendMessage(
      this.jid,
      { text },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async image(media: WAMediaUpload, caption?: string, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        image: media,
        ...(caption ? { caption } : {}),
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async video(media: WAMediaUpload, caption?: string, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        video: media,
        ...(caption ? { caption } : {}),
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async audio(media: WAMediaUpload, ptt = false, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        audio: media,
        mimetype: "audio/mp4",
        ptt,
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async sticker(media: WAMediaUpload, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        sticker: media,
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async document(
    media: WAMediaUpload,
    fileName: string,
    mimetype?: MimeType,
    reply: boolean = true,
  ) {
    await this.sock.sendMessage(
      this.jid,
      {
        document: media,
        fileName,
        mimetype: mimetype ?? "text/plain",
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async location(
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
    reply: boolean = true,
  ) {
    await this.sock.sendMessage(
      this.jid,
      {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          ...(name ? { name } : {}),
          ...(address ? { address } : {}),
        },
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async contact(displayName: string, vcard: string, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        contacts: {
          displayName,
          contacts: [
            {
              displayName,
              vcard,
            },
          ],
        },
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  async reaction(emoji: string, message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      react: {
        text: emoji,
        key: message.key,
      },
    });
  }

  async delete(message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      delete: message.key,
    });
  }

  async edit(text: string, message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      text,
      edit: message.key,
    });
  }
}
