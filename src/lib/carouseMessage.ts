import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
  type WAMessage,
  type WASocket,
} from "baileys";

export interface CarouselCard {
  title: string;
  subtitle?: string;
  bodyText: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
}

export interface CarouselOptions {
  bodyText: string;
  footerText?: string;
  quoted?: WAMessage;
  cards: CarouselCard[];
}

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
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: card.buttonText,
                  url: card.buttonUrl,
                  webview_interaction: true,
                }),
              },
            ],
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
