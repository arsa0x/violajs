# violajs

A simple WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) and powered by the [Bun](https://bun.sh/) runtime.

**violajs** features a plugin-based architecture and multi-session support, making it easy to extend with custom commands and manage multiple WhatsApp accounts.

---

## Prerequisites

Before getting started, make sure you have the following installed:

- [Bun](https://bun.sh/) — The latest version is recommended.
- [Git](https://git-scm.com/) — Optional, for cloning the repository.
- An active WhatsApp account to use for the bot.

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/arsa0x/violajs.git
cd violajs
```

### 2. Install Dependencies

Install the required dependencies using Bun:

```bash
bun install
```

### 3. Configure the Bot

Create a `config.ts` file, or rename `config.ts.example` to `config.ts`.

Make sure to review the configuration options before starting the bot.

---

## Quick Start

### Create a New Session

Create a new WhatsApp session by specifying a session name:

```bash
bun run start create --session session_name
```

Alternatively, run the entry point directly:

```bash
bun run index.ts create --session session_name
```

Replace `session_name` with your desired session name.

If no session name is specified when running the bot, the default session is `default`.

### Start the Bot

Start a specific session:

```bash
bun run index.ts --session session_name
```

Or start the default session:

```bash
bun run index.ts
```

### Run All Sessions

To start all available sessions, use:

```bash
bun run index.ts --all
```

Alternatively, use the shorthand option:

```bash
bun run index.ts -a
```

---

## Building a Standalone Executable

violajs can be compiled into a standalone executable file using Bun.

Run the build command:

```bash
bun run build
```

Once the build is complete, run the executable on Linux or macOS:

```bash
./dist/violajs
```

---

## Project Structure

```bash
violajs/
├── commands/
│   └── tools/
├── config.ts
├── index.ts
├── lib/
│   ├── interactive/
│   │   ├── index.ts
│   │   ├── response.ts
│   │   ├── send.ts
│   │   └── types.ts
│   ├── logger.ts
│   ├── qr/
│   │   ├── index.ts
│   │   ├── qr.c
│   │   └── qr.h
│   └── send.ts
├── production.ts
├── sessions/
├── src/
│   ├── app.ts
│   ├── build.ts
│   ├── cli.ts
│   ├── core/
│   │   ├── command.ts
│   │   ├── context.ts
│   │   ├── dispatcher.ts
│   │   ├── loader.ts
│   │   ├── middleware.ts
│   │   ├── parser.ts
│   │   ├── registry.ts
│   │   ├── socket.ts
│   │   └── staticLoader.ts
│   ├── generated/
│   │   └── commands.ts
│   ├── middlewares/
│   │   ├── cooldown.ts
│   │   ├── group.ts
│   │   ├── logger.ts
│   │   └── owner.ts
│   ├── storage/
│   │   ├── auth.ts
│   │   └── cache.ts
│   └── types/
│       ├── command.ts
│       ├── config.ts
│       ├── middleware.ts
│       └── mime.ts
└── tsconfig.json
```

---

## Creating a Plugin

Adding new functionality to violajs is simple. Create a `.ts` or `.js` file inside the appropriate category directory under `commands/`.

For example, the following plugin defines a `ping` command:

```typescript
import { defineCommand } from "@core/command";
import { cooldown } from "@middlewares/cooldown";
import { groupOnly } from "@middlewares/group";

export default defineCommand({
  name: "ping",
  aliases: ["p"],
  middleware: [groupOnly(), cooldown(100000)],
  async execute(ctx) {
    await ctx.send.text("Pong!");

    // Log a successful response
    ctx.log.info("Message sent successfully");
  },
});
```

### Example Explained

- **`name`** — Defines the command name.
- **`aliases`** — Specifies alternative names for the command.
- **`middleware`** — Applies middleware to control command execution. In this example, the command is restricted to groups and uses a cooldown.
- **`execute(ctx)`** — Defines the command's behavior.
- **`ctx.send.text()`** — Sends a text message.
- **`ctx.log.info()`** — Writes an informational log message.

The example uses `groupOnly()` to restrict the command to group chats and `cooldown(100000)` to apply a cooldown of 100,000 milliseconds (100 seconds).


## Interactive Messages

The sender exposes native-flow quick replies and single-select lists through `ctx.send.interactive`. Button and row IDs can be command strings, so a tap reuses the existing parser, middleware, and dispatcher.

Quick replies:

```typescript
await ctx.send.interactive.quickReply({
  title: "Choose an action",
  body: "What would you like to do?",
  footer: "violajs",
  buttons: [
    { text: "Ping", id: ".ping" },
    { text: "Open menu", id: ".menu" },
  ],
});
```

Single-select list:

```typescript
await ctx.send.interactive.singleSelect({
  title: "Tools",
  body: "Choose a command.",
  selectLabel: "Select tool",
  sections: [
    {
      title: "General",
      rows: [
        { title: "Ping", description: "Check whether the bot is online", id: ".ping" },
        { title: "Interactive demo", id: ".interactive" },
      ],
    },
  ],
});
```

The sender also supports URL, call, copy-code, location-request, and in-app signup actions. Interactive messages can optionally include an uploaded image or video in the header:

```typescript
await ctx.send.interactive.urlButton({
  body: "Open the project page.",
  text: "Open GitHub",
  url: "https://github.com/arsa0x/violajs",
});

await ctx.send.interactive.callButton({
  body: "Need help? Call support.",
  text: "Call support",
  phoneNumber: "+6281234567890",
});

await ctx.send.interactive.copyCode({
  body: "Copy this demo code.",
  text: "Copy code",
  code: "VIOLA-DEMO",
});

await ctx.send.interactive.inAppSignup({
  title: "Create an account",
  body: "Continue with the in-app signup action.",
});

await ctx.send.interactive.quickReply({
  body: "This message has an image header.",
  headerMedia: { type: "image", url: "https://example.com/banner.jpg" },
  buttons: [{ text: "Continue", id: ".continue" }],
});

await ctx.send.interactive.requestLocation({
  body: "Share your current location if you want to.",
  text: "Share location",
});
```

All methods quote the incoming message by default. Set `quoted: false` to send without a quoted message. Quick replies support 1–3 buttons, and single-select requires at least one section with at least one row. The built-in `.interactive` command demonstrates the variants.

Native-flow responses are parsed as JSON and only known response-ID fields are forwarded to the command parser; malformed or unrecognized payloads are ignored rather than treated as command text.


### Carousel

Send 2–10 image cards with one consistent button type (quick reply, URL, call, copy-code, or single-select) across all cards:

```typescript
await ctx.send.interactive.carousel({
  body: "Browse these projects.",
  cards: [
    {
      image: "https://example.com/project-one.jpg",
      title: "Project One",
      body: "A short description.",
      button: { type: "quick_reply", text: "Details", id: ".project one" },
    },
    {
      image: "https://example.com/project-two.jpg",
      title: "Project Two",
      body: "Another description.",
      button: { type: "quick_reply", text: "Details", id: ".project two" },
    },
  ],
});
```

URL cards default `merchantUrl` to the destination URL and enable `webviewInteraction` to match the Rust implementation. Copy-code cards default their ID to the copied code. Image URLs must be publicly reachable; Baileys uploads each image to WhatsApp before relaying the carousel. Use `.interactive carousel` to try the demo. Rendering depends on WhatsApp client/version, so test on both mobile and Web/Desktop.

---

## Contributing

Contributions are welcome! Whether you have a feature idea, have found a bug, or want to improve the documentation, your help is appreciated.

To contribute:

1. Fork the repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Commit your changes:

   ```bash
   git commit -m "Add XYZ feature"
   ```

4. Push your branch:

   ```bash
   git push origin feature/your-feature-name
   ```

5. Open a Pull Request.

Please make sure your changes are clear, focused, and properly tested before submitting a Pull Request.

---

## Acknowledgements

Violajs is inspired by ideas, implementations, and open-source projects from the community. We would like to acknowledge the projects that have helped inform its development.

### Projects

- [**Rubby-MD**](https://github.com/KyuuX444/Rubby-MD) — ISC License. Referenced for WhatsApp group management commands and more.

---

## License

violajs is distributed under the [MIT License](https://github.com/arsa0x/violajs/blob/main/LICENSE).

See the `LICENSE` file for the full license text.
