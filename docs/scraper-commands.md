# Scraper and lookup commands

These commands are small, independently written ViolaJS adapters inspired by the kinds of utilities collected in [KumpulanScraper](https://github.com/XZEERH/KumpulanScraper). They do not copy its source files. The upstream repository currently has no license file, so this project treats it as a feature reference only.

All commands use native `fetch` and the existing Cheerio dependency where HTML parsing is needed. No Playwright, Puppeteer, Chromium, or other headless-browser dependency is introduced.

## Downloader

| Command | Aliases | Usage | Notes |
| --- | --- | --- | --- |
| `aio` | `dl`, `alldl` | `.aio <media URL>` | Resolves media through the public VideoDownloadTools endpoint. The service may fail, change its response, or reject a platform. |
| `mediafire` | `mf`, `mfire` | `.mediafire <MediaFire URL>` | Extracts the public direct-download URL from a MediaFire page. It returns a link instead of downloading the file to the bot host. |
| `githubdl` | `ghdl`, `repozip` | `.githubdl <owner/repo or GitHub URL>` | Gets repository metadata and a ZIP archive URL through the GitHub API. Public repositories only. |

## Search and metadata

| Command | Aliases | Usage | Notes |
| --- | --- | --- | --- |
| `search` | `websearch`, `ddg` | `.search <query>` | Returns up to five results from DuckDuckGo HTML search. |
| `spotify` | `spinfo`, `spotifyinfo` | `.spotify <Spotify URL>` | Reads public embed metadata; it does not download Spotify audio. |
| `ytinfo` | `youtubeinfo`, `ytmeta` | `.ytinfo <YouTube video URL>` | Reads public YouTube oEmbed metadata; it does not download the video. |

## Tools

| Command | Aliases | Usage | Notes |
| --- | --- | --- | --- |
| `qr` | `qrcode` | `.qr <text or URL>` | Renders a small QR code as Unicode text. Input is limited to 250 characters to keep messages manageable. |

## Reliability and privacy

- These features depend on third-party websites and their undocumented endpoints. A site redesign, anti-bot policy, rate limit, or API change can break a command without a ViolaJS release.
- Do not send private URLs, access tokens, or sensitive data to third-party resolver services.
- The `aio` command submits the supplied public media URL to VideoDownloadTools. Use it only for content you are authorized to access.
- Commands return links and metadata; they do not persist downloaded files on the bot host.
- Scrapers that require Playwright or another headless browser are intentionally excluded.
