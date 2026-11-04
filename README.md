<img src="assets/banner.png"/>

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
bun start create --session session_name
```

Replace `session_name` with your desired session name.

If no session name is specified when running the bot, the default session is `default`.

### Start the Bot

Start a specific session:

```bash
bun start --session session_name
```

Or start the default session:

```bash
bun start
```

### Run All Sessions

To start all available sessions, use:

```bash
bun start --all
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

---

## Documentations

- [Interactive Messages](docs/interactive-messages.md) — Documentation for interactive WhatsApp messages, including carousels, buttons, and footers.
- [Argument Parser (`Args`)](docs/argument-parser.md) — Documentation for flag definitions, argument parsing, supported flag types, and accessing parsed arguments.
- [Scraper Commands](docs/scraper-commands.md) — Downloader, web search, Spotify/YouTube metadata, Alight Motion preset lookup, and QR commands.

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
- [**KumpulanScraper**](https://github.com/XZEERH/KumpulanScraper) — Referenced for scraper feature ideas; no source files were copied.

---

## License

violajs is distributed under the [MIT License](https://github.com/arsa0x/violajs/blob/main/LICENSE).

See the `LICENSE` file for the full license text.
