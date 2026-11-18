import type { WAMessage } from "@oxidezap/baileyrs";

function stringField(
  value: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Converts WhatsApp button/list replies into a stable response ID.
 *
 * Native-flow paramsJson is untrusted JSON, not command text. Only known ID
 * fields are returned; malformed JSON and unknown payloads are ignored.
 */
export function extractInteractiveResponse(message: WAMessage): string | null {
  const content = message.message;
  if (!content) return null;

  const legacyResponse =
    content.buttonsResponseMessage?.selectedButtonId ??
    content.listResponseMessage?.singleSelectReply?.selectedRowId ??
    content.templateButtonReplyMessage?.selectedId;

  if (typeof legacyResponse === "string" && legacyResponse.trim()) {
    return legacyResponse;
  }

  const paramsJson =
    content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (typeof paramsJson !== "string" || !paramsJson.trim()) return null;

  try {
    const parsed: unknown = JSON.parse(paramsJson);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const value = parsed as Record<string, unknown>;
    const direct = stringField(value, [
      "id",
      "row_id",
      "rowId",
      "selected_id",
      "selectedId",
      "selectedRowId",
      "button_id",
      "buttonId",
    ]);
    if (direct) return direct;

    // Some clients wrap the selected value inside a response object.
    const nested = value.response;
    if (
      typeof nested === "object" &&
      nested !== null &&
      !Array.isArray(nested)
    ) {
      return stringField(nested as Record<string, unknown>, [
        "id",
        "row_id",
        "rowId",
        "selected_id",
        "selectedId",
        "selectedRowId",
      ]);
    }

    return null;
  } catch {
    return null;
  }
}
