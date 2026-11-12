# violajs

<img src="assets/banner.png" alt="violajs banner" />

**violajs** is a plugin-based WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys) and [Bun](https://bun.sh/).

It is designed to be simple to extend, with a command system, event handlers, and multi-session support.

## Features

- **Multi-session** — Run multiple WhatsApp accounts independently.
- **Plugin system** — Extend the bot with custom command and event plugins.
- **Command middleware** — Control command execution with reusable middleware.
- **Event handling** — Handle internal and raw Baileys events.
- **Hot reload** — Reload command and event plugins without restarting the bot.

For the complete command list and usage, see [Command Documentation](docs/commands.md).

## Requirements

- [Bun](https://bun.sh/) >= 1.4.0
- An active WhatsApp account

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/arsa0x/violajs.git
cd violajs
bun install
```

Generate the configuration file:

```bash
bun run generate
```

Edit `config.ts` to configure your bot.

## Quick Start

Create a new WhatsApp session:

```bash
bun start create --session my-session
```

Pair using your phone number:

```bash
bun start create --session my-session -p -n <phone_number>
```

Start a session:

```bash
bun start --session my-session
```

Or start all available sessions:

```bash
bun start --all
```

If no session is specified, violajs uses the `default` session.

## Development

Start the bot in development mode:

```bash
bun run dev
```

Development mode automatically detects plugin changes:

- New plugins are loaded automatically.
- Updated plugins are reloaded.
- Deleted plugins are unregistered.
- WhatsApp sessions do not need to reconnect when plugins change.

## Plugin Development

violajs supports two types of plugins:

- **Command Plugins** — Add commands, aliases, flags, and middleware.
- **Event Plugins** — React to WhatsApp messages, group updates, and other events.

Create your plugins in the `plugins/commands/` and `plugins/events/` directories.

Start here:

- [Command Plugins](docs/commands.md)
- [Event Plugins](docs/events.md)

## Build

Build a standalone executable:

```bash
bun run build
```

The executable will be generated in `dist/`.

## Documentation

| Documentation                                        | Description                             |
| ---------------------------------------------------- | --------------------------------------- |
| [Commands](docs/commands.md)                         | Available commands, aliases, and flags. |
| [Event Plugins](docs/events.md)                      | Event types and plugin handlers.        |
| [Interactive Messages](docs/interactive-messages.md) | Buttons, lists, and carousels.          |
| [Argument Parser](docs/argument-parser.md)           | Command flags and argument parsing.     |

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes and test them.
4. Submit a pull request.

## Acknowledgements

- [Rubby-MD](https://github.com/KyuuX444/Rubby-MD) — Referenced for group management features.
- [KumpulanScraper](https://github.com/XZEERH/KumpulanScraper) — Referenced for scraper feature ideas.

## License

This project is licensed under the [MIT License](LICENSE).
