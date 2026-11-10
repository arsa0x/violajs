import { describe, expect, test } from "bun:test";
import {
  buildCarouselButton,
  buildCarouselButtons,
} from "../lib/interactive/carousel-button";

describe("buildCarouselButton", () => {
  test("serializes URL buttons with Rust-compatible defaults", () => {
    const result = buildCarouselButton({
      type: "url",
      text: "Open",
      url: "https://example.com/path",
    });
    expect(result.name).toBe("cta_url");
    expect(JSON.parse(result.buttonParamsJson)).toEqual({
      display_text: "Open",
      url: "https://example.com/path",
      merchant_url: "https://example.com/path",
      webview_interaction: true,
    });
  });
  test("serializes URL button overrides", () => {
    const result = buildCarouselButton({
      type: "url",
      text: "Open",
      url: "https://example.com",
      merchantUrl: "https://merchant.example.com",
      webviewInteraction: false,
    });
    expect(JSON.parse(result.buttonParamsJson)).toMatchObject({
      merchant_url: "https://merchant.example.com",
      webview_interaction: false,
    });
  });
  test("serializes call and copy buttons", () => {
    expect(
      buildCarouselButton({
        type: "call",
        text: "Call",
        phoneNumber: "+628123456789",
      }).name,
    ).toBe("cta_call");
    const copy = buildCarouselButton({
      type: "copy",
      text: "Copy",
      code: "PROMO",
    });
    expect(copy.name).toBe("cta_copy");
    expect(JSON.parse(copy.buttonParamsJson)).toEqual({
      display_text: "Copy",
      copy_code: "PROMO",
      id: "PROMO",
    });
  });
  test("serializes single-select sections and rows", () => {
    const result = buildCarouselButton({
      type: "single_select",
      title: "Choose",
      sections: [
        {
          title: "Options",
          rows: [
            { title: "Ping", id: ".ping", description: "Check bot status" },
          ],
        },
      ],
    });
    expect(result.name).toBe("single_select");
    expect(JSON.parse(result.buttonParamsJson)).toEqual({
      title: "Choose",
      sections: [
        {
          title: "Options",
          rows: [
            { title: "Ping", id: ".ping", description: "Check bot status" },
          ],
        },
      ],
    });
  });
  test("rejects invalid URLs, phone numbers, and empty select sections", () => {
    expect(() =>
      buildCarouselButton({
        type: "url",
        text: "Open",
        url: "javascript:alert(1)",
      }),
    ).toThrow();
    expect(() =>
      buildCarouselButton({
        type: "call",
        text: "Call",
        phoneNumber: "not-a-number",
      }),
    ).toThrow();
    expect(() =>
      buildCarouselButton({
        type: "single_select",
        title: "Choose",
        sections: [],
      }),
    ).toThrow();
  });
});

describe("buildCarouselButtons", () => {
  test("serializes multiple mixed button types for one card", () => {
    const result = buildCarouselButtons(
      [
        { type: "quick_reply", text: "Details", id: ".details" },
        { type: "url", text: "Open", url: "https://example.com" },
        { type: "copy", text: "Copy", code: "PROMO" },
      ],
      2,
    );

    expect(result).toHaveLength(3);
    expect(result.map((button) => button.name)).toEqual([
      "quick_reply",
      "cta_url",
      "cta_copy",
    ]);
    expect(JSON.parse(result[1]!.buttonParamsJson)).toMatchObject({
      merchant_url: "https://example.com",
      webview_interaction: true,
    });
  });

  test("rejects a carousel card with no buttons", () => {
    expect(() => buildCarouselButtons([], 3)).toThrow("card 3");
  });
});
