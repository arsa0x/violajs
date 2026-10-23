import {
  generateWAMessageFromContent,
  type WAMessage,
  type WASocket,
} from "baileys";
import type {
  InteractiveQuickReplyOptions,
  InteractiveSingleSelectOptions,
} from "./types";

function assertNonEmpty(value: string, name: string): void {
  if (!value.trim()) {
    throw new TypeError(`Interactive message ${name} cannot be empty.`);
  }
}

/**
 * Sends a WhatsApp native-flow message through Baileys' relay API.
 *
 * Native-flow messages are serialized as interactiveMessage inside
 * viewOnceMessage; sock.sendMessage's ordinary text payload cannot represent
 * these buttons by itself.
 */
async function sendNativeFlow(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  content: Record<string, unknown>,
  quote: boolean,
): Promise<void> {
  const userJid = sock.user?.id;
  if (!userJid) {
    throw new Error("Cannot send an interactive message before WhatsApp is connected.");
  }

  const generated = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: content,
        },
      },
    } as never,
    {
      userJid,
      quoted: quote ? quotedMessage : undefined,
    },
  );

  if (!generated.message || !generated.key.id) {
    throw new Error("Baileys failed to generate the interactive message.");
  }

  // Baileys does not add WhatsApp's native-flow stanza metadata automatically.
  // Without these nodes, the server may accept the relay but clients cannot
  // render the interactive message.
  const bizNode = {
    tag: "biz",
    attrs: {},
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [
          {
            tag: "native_flow",
            attrs: { v: "9", name: "mixed" },
          },
        ],
      },
    ],
  };

  const additionalNodes = jid.endsWith("@g.us")
    ? [bizNode]
    : [{ tag: "bot", attrs: { biz_bot: "1" } }, bizNode];

  await sock.relayMessage(jid, generated.message, {
    messageId: generated.key.id,
    additionalNodes,
  });
}

/** Sends native-flow quick-reply buttons. */
export async function sendQuickReply(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveQuickReplyOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");

  if (options.buttons.length < 1 || options.buttons.length > 3) {
    throw new RangeError("Quick-reply messages must contain between 1 and 3 buttons.");
  }

  for (const button of options.buttons) {
    assertNonEmpty(button.text, "button text");
    assertNonEmpty(button.id, "button id");
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: {
        ...(options.title ? { title: options.title } : {}),
        hasMediaAttachment: false,
      },
      nativeFlowMessage: {
        buttons: options.buttons.map((button) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: button.text,
            id: button.id,
          }),
        })),
      },
    },
    options.quoted ?? true,
  );
}

/** Sends a native-flow single-select list with one or more sections. */
export async function sendSingleSelect(
  sock: WASocket,
  jid: string,
  quotedMessage: WAMessage,
  options: InteractiveSingleSelectOptions,
): Promise<void> {
  assertNonEmpty(options.body, "body");
  assertNonEmpty(options.selectLabel ?? "Choose", "select label");

  if (options.sections.length === 0) {
    throw new RangeError("Single-select messages must contain at least one section.");
  }

  for (const section of options.sections) {
    if (section.rows.length === 0) {
      throw new RangeError("Single-select sections must contain at least one row.");
    }

    for (const row of section.rows) {
      assertNonEmpty(row.title, "row title");
      assertNonEmpty(row.id, "row id");
    }
  }

  await sendNativeFlow(
    sock,
    jid,
    quotedMessage,
    {
      body: { text: options.body },
      ...(options.footer ? { footer: { text: options.footer } } : {}),
      header: {
        ...(options.title ? { title: options.title } : {}),
        hasMediaAttachment: false,
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: options.selectLabel ?? "Choose",
              sections: options.sections.map((section) => ({
                title: section.title,
                rows: section.rows.map((row) => ({
                  title: row.title,
                  id: row.id,
                  ...(row.description ? { description: row.description } : {}),
                })),
              })),
            }),
          },
        ],
      },
    },
    options.quoted ?? true,
  );
}
