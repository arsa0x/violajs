import type { MimeType } from "../src/types/mime";
import type { WAMediaUpload, WAMessage, WASocket } from "baileys";

/**
 * Provides helper methods for sending WhatsApp messages and media.
 *
 * Wraps Baileys' `sendMessage` method with a simpler API for sending
 * text, media, reactions, and more.
 */
export class Send {
  /**
   * Creates a new message sender.
   *
   * @param sock - The Baileys WhatsApp socket used to send messages.
   * @param msg - The original WhatsApp message associated with the current context.
   * @param jid - The recipient's WhatsApp JID.
   */
  constructor(
    private readonly sock: WASocket,
    private readonly msg: WAMessage,
    private readonly jid: string,
  ) {}

  /**
   * Sends a text message.
   *
   * If `body` is an array of strings, its elements are concatenated without
   * a separator.
   *
   * @param body - The message text or an array of strings to concatenate.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the message has been sent.
   */
  async text(body: string | string[], reply: boolean = true) {
    const text = Array.isArray(body) ? body.join("") : body;

    await this.sock.sendMessage(
      this.jid,
      { text },
      { quoted: reply ? this.msg : undefined },
    );
  }

  /**
   * Sends an image message.
   *
   * @param media - The image media to send.
   * @param caption - An optional caption for the image.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the image has been sent.
   */
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

  /**
   * Sends a video message.
   *
   * @param media - The video media to send.
   * @param caption - An optional caption for the video.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the video has been sent.
   */
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

  /**
   * Sends an audio message.
   *
   * @param media - The audio media to send.
   * @param ptt - Whether to send the audio as a push-to-talk voice message.
   * Defaults to `false`.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the audio has been sent.
   */
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

  /**
   * Sends a sticker message.
   *
   * @param media - The sticker media to send.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the sticker has been sent.
   */
  async sticker(media: WAMediaUpload, reply: boolean = true) {
    await this.sock.sendMessage(
      this.jid,
      {
        sticker: media,
      },
      { quoted: reply ? this.msg : undefined },
    );
  }

  /**
   * Sends a document message.
   *
   * @param media - The document media to send.
   * @param fileName - The name of the document, including its extension if applicable.
   * @param mimetype - The document's MIME type. Defaults to `text/plain`.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the document has been sent.
   */
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

  /**
   * Sends a location message.
   *
   * @param latitude - The location's latitude in decimal degrees.
   * @param longitude - The location's longitude in decimal degrees.
   * @param name - An optional name for the location.
   * @param address - An optional address for the location.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the location has been sent.
   */
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

  /**
   * Sends a contact message.
   *
   * @param displayName - The contact's display name.
   * @param vcard - The contact's vCard data.
   * @param reply - Whether to quote the original message. Defaults to `true`.
   * @returns A promise that resolves when the contact has been sent.
   */
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

  /**
   * Reacts to a WhatsApp message with an emoji.
   *
   * @param emoji - The emoji to use as the reaction. Use an empty string to remove a reaction.
   * @param message - The message to react to. Defaults to the original message.
   * @returns A promise that resolves when the reaction has been sent.
   */
  async reaction(emoji: string, message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      react: {
        text: emoji,
        key: message.key,
      },
    });
  }

  /**
   * Requests deletion of a WhatsApp message.
   *
   * @param message - The message to delete. Defaults to the original message.
   * @remarks
   * Whether the message can actually be deleted depends on WhatsApp's
   * deletion rules and the permissions of the sender.
   * @returns A promise that resolves when the deletion request has been sent.
   */
  async delete(message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      delete: message.key,
    });
  }

  /**
   * Edits a previously sent WhatsApp message.
   *
   * @param text - The replacement text.
   * @param message - The message to edit. Defaults to the original message.
   * @remarks
   * Editing is subject to WhatsApp's message-editing restrictions.
   * @returns A promise that resolves when the edit request has been sent.
   */
  async edit(text: string, message: WAMessage = this.msg) {
    await this.sock.sendMessage(this.jid, {
      text,
      edit: message.key,
    });
  }
}
