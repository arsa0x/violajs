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
