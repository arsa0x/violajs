# Menu command

The `menu` command displays available ViolaJS commands in a WhatsApp native-flow single-select list. Select an entry to send its command text back to the chat.

## Usage

| Command | Description |
| --- | --- |
| `.menu` | Show all menu categories. |
| `.menu <category>` | Show commands from one category. |
| `.help` | Alias for `.menu`. |
| `.allmenu` | Alias for `.menu`. |

### Available categories

| Category | Description |
| --- | --- |
| `tools` | General utilities and interactive-message demos. |
| `downloader` | Media, GitHub, and MediaFire link resolvers. |
| `search` | Web search and public media metadata lookup. |
| `admin` | WhatsApp group administration commands. |
| `nsfw` | NSFW-related commands. |

Examples:

```text
.menu
.menu downloader
.menu search
```

Category names are case-insensitive. An unknown category returns the available category names.

## Notes

- The menu uses WhatsApp's native-flow single-select message. Client support and appearance may vary between WhatsApp versions and platforms.
- Selecting an entry sends its command text; normal command parsing, permissions, and middleware still apply.
- The menu is a curated list. A command may exist in the bot without appearing here until the menu list is updated.
