export interface InteractiveQuickReplyButton {
  /** Text displayed on the button. */
  text: string;
  /** Stable response ID. Use a command string such as ".help" to reuse dispatch. */
  id: string;
}

export interface InteractiveHeaderMedia {
  /** Publicly reachable image or video URL. Media is uploaded to WhatsApp before sending. */
  type: "image" | "video";
  url: string;
  fallbackUrls?: string[];
}

export interface InteractiveQuickReplyOptions {
  body: string;
  title?: string;
  footer?: string;
  /** Optional image/video displayed in the message header. */
  headerMedia?: InteractiveHeaderMedia;
  buttons: InteractiveQuickReplyButton[];
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}

export interface InteractiveSelectRow {
  title: string;
  id: string;
  description?: string;
}

export interface InteractiveSelectSection {
  title: string;
  rows: InteractiveSelectRow[];
}

export interface InteractiveSingleSelectOptions {
  body: string;
  title?: string;
  footer?: string;
  /** Optional image/video displayed in the message header. */
  headerMedia?: InteractiveHeaderMedia;
  selectLabel?: string;
  sections: InteractiveSelectSection[];
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}

interface InteractiveActionBaseOptions {
  body: string;
  title?: string;
  footer?: string;
  /** Optional image/video displayed in the message header. */
  headerMedia?: InteractiveHeaderMedia;
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}

export interface InteractiveUrlButtonOptions extends InteractiveActionBaseOptions {
  /** Button label, e.g. "Open website". */
  text: string;
  /** Absolute http(s) URL opened when the button is tapped. */
  url: string;
  /** Optional merchant URL metadata used by some WhatsApp clients. */
  merchantUrl?: string;
}

export interface InteractiveCallButtonOptions extends InteractiveActionBaseOptions {
  /** Button label, e.g. "Call support". */
  text: string;
  /** Phone number in international format, e.g. "+6281234567890". */
  phoneNumber: string;
}

export interface InteractiveCopyCodeOptions extends InteractiveActionBaseOptions {
  /** Button label, e.g. "Copy code". */
  text: string;
  /** Code copied by WhatsApp when the button is tapped. */
  code: string;
}

export interface InteractiveLocationRequestOptions extends InteractiveActionBaseOptions {
  /** Button label shown when asking the recipient to share their location. */
  text: string;
}

export type InteractiveCarouselButton =
  | { type: "quick_reply"; text: string; id: string }
  | {
      type: "url";
      text: string;
      url: string;
      merchantUrl?: string;
      /** Defaults to true to match the Rust carousel implementation. */
      webviewInteraction?: boolean;
    }
  | { type: "call"; text: string; phoneNumber: string }
  | { type: "copy"; text: string; code: string; id?: string }
  | {
      type: "single_select";
      title: string;
      sections: InteractiveSelectSection[];
    };

export interface InteractiveCarouselCard {
  /** Publicly reachable image URL. The image is uploaded to WhatsApp before sending. */
  image: string;
  imageFallbacks?: string[];
  /** Short title shown in the card body. */
  title: string;
  /** Optional card description. */
  body?: string;
  /** Optional footer displayed on this card. */
  footer?: string;
  /** One or more native-flow buttons; button types may differ within a card. */
  buttons?: InteractiveCarouselButton[];
  /** @deprecated Use buttons. Kept for compatibility with the previous API. */
  button?: InteractiveCarouselButton;
}

export interface InteractiveCarouselOptions {
  /** Required message text displayed above the carousel cards. */
  body: string;
  /** Native interactive carousels require at least 2 cards. */
  cards: InteractiveCarouselCard[];
  /** Optional footer displayed below the carousel message body. */
  footer?: string;
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}

export interface InteractiveInAppSignupOptions extends InteractiveActionBaseOptions {}
