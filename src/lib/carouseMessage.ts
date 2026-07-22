import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  type WAMessage,
  type WASocket,
} from "baileys";

export type CarouselButton =
  | {
      type: "cta_url";
      displayText: string;
      url: string;
      merchantUrl?: string;
    }
  | {
      type: "cta_call";
      displayText: string;
      phoneNumber: string;
    }
  | {
      type: "cta_copy";
      displayText: string;
      copyCode: string;
      id?: string;
    }
  | {
      type: "quick_reply";
      displayText: string;
      id: string;
    }
  | {
      type: "single_select";
      title: string;
      sections: {
        title: string;
        rows: {
          title: string;
          description?: string;
          id: string;
          header?: string;
        }[];
      }[];
    };

function buildNativeFlowButton(btn: CarouselButton) {
  switch (btn.type) {
    case "cta_url":
      return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText,
          url: btn.url,
          merchant_url: btn.merchantUrl ?? btn.url,
          webview_interaction: true,
        }),
      };
    case "cta_call":
      return {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText,
          phone_number: btn.phoneNumber,
        }),
      };
    case "cta_copy":
      return {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText,
          copy_code: btn.copyCode,
          id: btn.id ?? btn.copyCode,
        }),
      };
    case "quick_reply":
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText,
          id: btn.id,
        }),
      };
    case "single_select":
      return {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: btn.title,
          sections: btn.sections,
        }),
      };
  }
}

export interface CarouselCard {
  title: string;
  subtitle?: string;
  bodyText: string;
  imageUrl: string;
  buttons: CarouselButton[];
}

export interface CarouselOptions {
  bodyText: string;
  footerText?: string;
  quoted?: WAMessage;
  cards: CarouselCard[];
}

/// Contoh penggunaan:
///
/// await sendCarouselMessage(sock, jid, {
///   quoted: msg,
///   bodyText: "Body text",
///   footerText: "Footer text",
///   cards: [
///     {
///       title: "Title card",
///       bodyText: "Body card text",
///       imageUrl: "https://example.com/image.jpg",
///       buttons: [
///         {
///           type: "cta_url",
///           displayText: "Display button text",
///           url: "https://www.example.com",
///         },
///         {
///           type: "quick_reply",
///           displayText: "Display text button",
///           id: "Id message text",
///         },
///       ],
///     },
///   ],
/// });
export async function sendCarouselMessage(
  sock: WASocket,
  jid: string,
  opts: CarouselOptions,
) {
  const cards: proto.Message.IInteractiveMessage[] = [];

  for (const card of opts.cards) {
    const imageMessage = await prepareWAMessageMedia(
      {
        image:
          typeof card.imageUrl === "string"
            ? { url: card.imageUrl }
            : card.imageUrl,
      },
      { upload: sock.waUploadToServer },
    );

    cards.push(
      proto.Message.InteractiveMessage.create({
        header: proto.Message.InteractiveMessage.Header.create({
          title: card.title,
          subtitle: card.subtitle ?? "",
          hasMediaAttachment: true,
          ...imageMessage,
        }),
        body: proto.Message.InteractiveMessage.Body.create({
          text: card.bodyText,
        }),
        footer: proto.Message.InteractiveMessage.Footer.create({
          text: "",
        }),
        nativeFlowMessage:
          proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons: card.buttons.map(buildNativeFlowButton),
            messageParamsJson: "{}",
          }),
      }),
    );
  }

  const contextInfo: proto.IContextInfo | undefined = opts.quoted
    ? {
        stanzaId: opts.quoted.key.id,
        participant: opts.quoted.key.participant || opts.quoted.key.remoteJid,
        quotedMessage: opts.quoted.message,
        remoteJid: jid,
      }
    : undefined;

  const interactiveMessage = proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({ text: opts.bodyText }),
    footer: proto.Message.InteractiveMessage.Footer.create({
      text: opts.footerText ?? "",
    }),
    header: proto.Message.InteractiveMessage.Header.create({
      hasMediaAttachment: false,
    }),
    carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.create({
      cards,
    }),
    contextInfo,
  });

  const msg = generateWAMessageFromContent(
    jid,
    {
      interactiveMessage,
    },
    {
      quoted: opts.quoted,
      userJid: sock.user!.id,
    },
  );

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

  await sock.relayMessage(jid, msg.message!, {
    messageId: msg.key.id!,
    additionalNodes: [bizNode as any],
  });

  return msg;
}
