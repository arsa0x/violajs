import { describe, expect, test } from "bun:test";
import type { WAMessage } from "baileys";
import { extractInteractiveResponse } from "@lib/interactive/response";

function message(value: unknown): WAMessage {
  return value as WAMessage;
}

describe("extractInteractiveResponse", () => {
  test("extracts IDs from native-flow quick replies", () => {
    expect(
      extractInteractiveResponse(
        message({
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                name: "quick_reply",
                paramsJson: JSON.stringify({
                  display_text: "Help",
                  id: ".help",
                }),
              },
            },
          },
        }),
      ),
    ).toBe(".help");
  });

  test("accepts row IDs from native-flow list responses", () => {
    expect(
      extractInteractiveResponse(
        message({
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                name: "single_select",
                paramsJson: JSON.stringify({ row_id: ".menu tools" }),
              },
            },
          },
        }),
      ),
    ).toBe(".menu tools");
  });

  test("supports legacy button and list response messages", () => {
    expect(
      extractInteractiveResponse(
        message({
          message: { buttonsResponseMessage: { selectedButtonId: ".yes" } },
        }),
      ),
    ).toBe(".yes");

    expect(
      extractInteractiveResponse(
        message({
          message: {
            listResponseMessage: {
              singleSelectReply: { selectedRowId: ".settings" },
            },
          },
        }),
      ),
    ).toBe(".settings");
  });

  test("ignores malformed, primitive, and unknown JSON payloads", () => {
    for (const paramsJson of [
      "{broken",
      '"just text"',
      "[]",
      '{"display_text":"Help"}',
    ]) {
      expect(
        extractInteractiveResponse(
          message({
            message: {
              interactiveResponseMessage: {
                nativeFlowResponseMessage: { paramsJson },
              },
            },
          }),
        ),
      ).toBeNull();
    }
  });

  test("ignores messages without an interactive response", () => {
    expect(
      extractInteractiveResponse(
        message({ message: { conversation: "hello" } }),
      ),
    ).toBeNull();
    expect(extractInteractiveResponse(message({}))).toBeNull();
  });
});
