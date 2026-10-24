import type { InteractiveCarouselButton } from "./types";

export interface SerializedCarouselButton { name: string; buttonParamsJson: string; }
function assertNonEmpty(value: string, name: string): void {
  if (!value.trim()) throw new TypeError(`Carousel ${name} cannot be empty.`);
}
function assertHttpUrl(value: string, name: string): string {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new TypeError(`Carousel ${name} must be a valid absolute URL.`); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError(`Carousel ${name} must use http or https.`);
  return url.toString();
}
export function buildCarouselButton(button: InteractiveCarouselButton, cardNumber = 1): SerializedCarouselButton {
  const label = `card ${cardNumber} button`;
  switch (button.type) {
    case "quick_reply":
      assertNonEmpty(button.text, `${label} text`);
      assertNonEmpty(button.id, `${label} ID`);
      return { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: button.text, id: button.id }) };
    case "url": {
      assertNonEmpty(button.text, `${label} text`);
      assertNonEmpty(button.url, `${label} URL`);
      const url = assertHttpUrl(button.url, `${label} URL`);
      const merchantUrl = button.merchantUrl ? assertHttpUrl(button.merchantUrl, `${label} merchant URL`) : url;
      return { name: "cta_url", buttonParamsJson: JSON.stringify({
        display_text: button.text, url, merchant_url: merchantUrl,
        webview_interaction: button.webviewInteraction ?? true,
      }) };
    }
    case "call":
      assertNonEmpty(button.text, `${label} text`);
      assertNonEmpty(button.phoneNumber, `${label} phone number`);
      if (!/^\+?[0-9][0-9 ()-]{3,19}$/.test(button.phoneNumber)) throw new TypeError(`Carousel ${label} phone number is invalid.`);
      return { name: "cta_call", buttonParamsJson: JSON.stringify({ display_text: button.text, phone_number: button.phoneNumber }) };
    case "copy":
      assertNonEmpty(button.text, `${label} text`);
      assertNonEmpty(button.code, `${label} code`);
      return { name: "cta_copy", buttonParamsJson: JSON.stringify({
        display_text: button.text, copy_code: button.code, id: button.id ?? button.code,
      }) };
    case "single_select":
      assertNonEmpty(button.title, `${label} select title`);
      if (button.sections.length === 0) throw new RangeError(`Carousel ${label} single-select must contain at least one section.`);
      for (const [i, section] of button.sections.entries()) {
        if (section.rows.length === 0) throw new RangeError(`Carousel section ${i + 1} must contain at least one row.`);
        for (const row of section.rows) {
          assertNonEmpty(row.title, "single-select row title");
          assertNonEmpty(row.id, "single-select row ID");
        }
      }
      return { name: "single_select", buttonParamsJson: JSON.stringify({
        title: button.title,
        sections: button.sections.map((section) => ({
          title: section.title,
          rows: section.rows.map((row) => ({ id: row.id, title: row.title, ...(row.description ? { description: row.description } : {}) })),
        })),
      }) };
  }
}

/** Serialize all buttons for one carousel card. Rust's builder allows mixed button variants. */
export function buildCarouselButtons(
  buttons: InteractiveCarouselButton[],
  cardNumber = 1,
): SerializedCarouselButton[] {
  if (buttons.length === 0) {
    throw new RangeError(`Carousel card ${cardNumber} must contain at least one button.`);
  }
  return buttons.map((button) => buildCarouselButton(button, cardNumber));
}
