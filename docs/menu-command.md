# Menu command

The `menu` command displays the commands registered in violajs in a WhatsApp native-flow single-select list. Select an entry to send its command text back to the chat.

## Usage

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `.menu`            | Show all menu categories.        |
| `.menu <category>` | Show commands from one category. |
| `.help`            | Alias for `.menu`.               |
| `.allmenu`         | Alias for `.menu`.               |

## Available categories

| Category        | Description                                         |
| --------------- | --------------------------------------------------- |
| `tools`         | General utilities and interactive-message features. |
| `downloader`    | Media and file download tools.                      |
| `search`        | Web search and public media metadata lookup.        |
| `admin`         | WhatsApp group administration commands.             |
| `nsfw`          | NSFW-related commands.                              |
| `ai`            | AI-related commands.                                |
| `game`          | Game commands.                                      |
| `maker`         | Content and media creation commands.                |
| `uncategorized` | Commands without a recognized category.             |

Examples:

```text
.menu
.menu downloader
.menu search
```

Category names are case-insensitive. An unknown category returns the available category names.

## Notes

- The menu is generated from the command definitions in `commands/` by `bun run generate`.
- Adding, removing, renaming, or changing a command's category is reflected in the generated menu after running the generator.
- The menu uses WhatsApp's native-flow single-select message. Client support and appearance may vary between WhatsApp versions and platforms.
- Selecting an entry sends its command text; normal command parsing, permissions, and middleware still apply.
