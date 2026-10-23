import type { WAMessage, WASocket } from "baileys";
import { sendQuickReply, sendSingleSelect } from "./send";
import type {
  InteractiveQuickReplyOptions,
  InteractiveSingleSelectOptions,
} from "./types";

export * from "./types";
export { extractInteractiveResponse } from "./response";

/** Interactive-message API bound to the current chat and quoted message. */
export class InteractiveSend {
  constructor(
    private readonly sock: WASocket,
    private readonly message: WAMessage,
    private readonly jid: string,
  ) {}

  /** Send buttons that return their configured IDs when tapped. */
  quickReply(options: InteractiveQuickReplyOptions): Promise<void> {
    return sendQuickReply(this.sock, this.jid, this.message, options);
  }

  /** Send a native-flow list selector. */
  singleSelect(options: InteractiveSingleSelectOptions): Promise<void> {
    return sendSingleSelect(this.sock, this.jid, this.message, options);
  }
}
