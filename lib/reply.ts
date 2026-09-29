import type { WAMediaUpload, WAMessage, WASocket } from "baileys";

export class Reply {
  private sock: WASocket;
  private msg: WAMessage;
  private jid: string;

  constructor(sock: WASocket, msg: WAMessage, jid: string) {
    this.msg = msg;
    this.sock = sock;
    this.jid = jid;1
  }

  async text(body: string) {
    await this.sock.sendMessage(this.jid, { text: body }, { quoted: this.msg });
  }

  async sticker(media: WAMediaUpload) {
    await this.sock.sendMessage(
      this.jid,
      {
        sticker: media,
      },
      {
        quoted: this.msg,
      },
    );
  }
}
