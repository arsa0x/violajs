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
