import { cc, ptr } from "bun:ffi";

const {
  symbols: { qrEncode },
} = cc({
  source: Bun.file("./lib/qr/qr.c"),
  symbols: {
    qrEncode: {
      args: ["cstring"],
      returns: "cstring",
    },
  },
});

export const qrToString = (input: string): string | null =>
  qrEncode(ptr(Buffer.from(input, "utf8")));
