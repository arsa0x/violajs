export interface InteractiveQuickReplyButton {
  /** Text displayed on the button. */
  text: string;
  /** Stable response ID. Use a command string such as ".help" to reuse dispatch. */
  id: string;
}

export interface InteractiveQuickReplyOptions {
  body: string;
  title?: string;
  footer?: string;
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
  selectLabel?: string;
  sections: InteractiveSelectSection[];
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}

interface InteractiveActionBaseOptions {
  body: string;
  title?: string;
  footer?: string;
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

export type InteractiveCarouselButton =
  | { type: "quick_reply"; text: string; id: string }
  | { type: "url"; text: string; url: string };

export interface InteractiveCarouselCard {
  /** Publicly reachable image URL. The image is uploaded to WhatsApp before sending. */
  image: string;
  /** Short title shown in the card body. */
  title: string;
  /** Optional card description. */
  body?: string;
  /** Each card in a carousel must use the same button type. */
  button: InteractiveCarouselButton;
}

export interface InteractiveCarouselOptions {
  /** Required message text displayed above the carousel cards. */
  body: string;
  /** Native interactive carousels require between 2 and 10 cards. */
  cards: InteractiveCarouselCard[];
  /** Whether to quote the incoming message. Defaults to true. */
  quoted?: boolean;
}
