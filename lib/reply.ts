import type { MimeType } from "../src/types/mime";
import type { WAMediaUpload, WAMessage, WASocket } from "baileys";

export class Reply {
  constructor(
    private readonly sock: WASocket,
    private readonly msg: WAMessage,
    private readonly jid: string,
  ) {}

  async text(body: string | string[]) {
    const text = Array.isArray(body) ? body.join("") : body;

    await this.sock.sendMessage(this.jid, { text }, { quoted: this.msg });
  }

  async image(media: WAMediaUpload, caption?: string) {
    await this.sock.sendMessage(
      this.jid,
      {
        image: media,
        ...(caption ? { caption } : {}),
      },
      { quoted: this.msg },
    );
  }

  async video(media: WAMediaUpload, caption?: string) {
    await this.sock.sendMessage(
      this.jid,
      {
        video: media,
        ...(caption ? { caption } : {}),
      },
      { quoted: this.msg },
    );
  }

  async audio(media: WAMediaUpload, ptt = false) {
    await this.sock.sendMessage(
      this.jid,
      {
        audio: media,
        mimetype: "audio/mp4",
        ptt,
      },
      { quoted: this.msg },
    );
  }

  async sticker(media: WAMediaUpload) {
    await this.sock.sendMessage(
      this.jid,
      {
        sticker: media,
      },
      { quoted: this.msg },
    );
  }

  async document(media: WAMediaUpload, fileName: string, mimetype?: MimeType) {
    await this.sock.sendMessage(
      this.jid,
      {
        document: media,
        fileName,
        mimetype: mimetype ?? "text/plain",
      },
      { quoted: this.msg },
    );
  }

  async location(
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
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
      { quoted: this.msg },
    );
  }

  async contact(displayName: string, vcard: string) {
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
      { quoted: this.msg },
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
