import type { WAMessage, WASocket } from "baileys";
import {
  sendCallButton,
  sendCarousel,
  sendCopyCode,
  sendQuickReply,
  sendSingleSelect,
  sendUrlButton,
} from "./send";
import type {
  InteractiveCallButtonOptions,
  InteractiveCarouselOptions,
  InteractiveCopyCodeOptions,
  InteractiveQuickReplyOptions,
  InteractiveSingleSelectOptions,
  InteractiveUrlButtonOptions,
} from "./types";

export * from "./types";
export { extractInteractiveResponse } from "./response";

/**
 * Interactive-message API bound to the current chat and quoted message.
 *
 * Native-flow features are not consistently rendered by WhatsApp Web/Desktop;
 * verify each button type on the target client before relying on it.
 */
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

  /** Send a swipeable carousel with 2–10 image cards. */
  carousel(options: InteractiveCarouselOptions): Promise<void> {
    return sendCarousel(this.sock, this.jid, this.message, options);
  }

  /** Send a native-flow button that opens an http(s) URL. */
  urlButton(options: InteractiveUrlButtonOptions): Promise<void> {
    return sendUrlButton(this.sock, this.jid, this.message, options);
  }

  /** Send a native-flow button that starts a phone call. */
  callButton(options: InteractiveCallButtonOptions): Promise<void> {
    return sendCallButton(this.sock, this.jid, this.message, options);
  }

  /** Send a native-flow button that copies a code. */
  copyCode(options: InteractiveCopyCodeOptions): Promise<void> {
    return sendCopyCode(this.sock, this.jid, this.message, options);
  }
}
