import { marked } from "marked";
import fs from "fs/promises";
import { log } from "@/lib/logger";
import path from "path";
import { load } from "cheerio";

const docsDir = path.resolve("docs");
const pagesDir = path.resolve("site", "pages");
const mdFiles = await fs.readdir(docsDir);

const TEMPLATE = (title: string, child: string) => String.raw`
<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f8f7fc" />
        <script>
            (() => {
                try {
                    const saved = localStorage.getItem("violajs-theme");
                    const prefersDark = window.matchMedia(
                        "(prefers-color-scheme: dark)",
                    ).matches;
                    if (saved === "dark" || (!saved && prefersDark))
                        document.documentElement.dataset.theme = "dark";
                } catch {}
            })();
        </script>
        <meta
            name="description"
            content="violajs is a plugin-based WhatsApp bot built with Baileys and Bun. Simple to extend, flexible to run."
        />
        <title>Violajs - ${title}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
        />
        <link rel="stylesheet" href="../style.css" />
    </head>
    <body>
        <header class="site-header">
            <nav class="nav container" aria-label="Main navigation">
                <a class="brand" href="#" aria-label="violajs home">
                    <span class="brand-mark">v<span>.</span></span>
                    <span>viola<span class="brand-light">js</span></span>
                </a>
                <button
                    class="nav-toggle"
                    aria-label="Open navigation"
                    aria-expanded="false"
                >
                    <span></span><span></span>
                </button>
                <div class="nav-links" id="nav-links">
                    <a href="#features">Features</a>
                    <a href="#getting-started">Getting started</a>
                    <a href="#plugins">Plugins</a>
                    <a href="#docs">Documentation</a>
                    <button
                        class="theme-toggle"
                        type="button"
                        aria-label="Switch to dark mode"
                        aria-pressed="false"
                    >
                        <span class="theme-icon" aria-hidden="true">☾</span
                        ><span class="theme-label">Dark mode</span>
                    </button>
                    <a
                        class="nav-github"
                        href="https://github.com/arsa0x/violajs"
                        target="_blank"
                        rel="noreferrer"
                        >GitHub <span aria-hidden="true">↗</span></a
                    >
                </div>
            </nav>
        </header>
          <main class="container">${child}</main>
          <footer class="footer">
            <div class="container footer-inner">
              <a class="brand" href="#"
                ><span class="brand-mark">v<span>.</span></span
                ><span>viola<span class="brand-light">js</span></span></a
              >
              <p>
                Made with care, powered by
                <a
                  href="https://github.com/WhiskeySockets/Baileys"
                  target="_blank"
                  rel="noreferrer"
                  >Baileys</a
                >
                &
                <a href="https://bun.sh" target="_blank" rel="noreferrer">Bun</a>.
              </p>
              <span class="footer-copy">© <span id="year"></span> violajs</span>
            </div>
          </footer>
        <script src="../script.js"></script>
    </body>
</html>
`;

for (const file of mdFiles) {
  const rawMd = await fs.readFile(path.join("docs", file));
  const html = await marked.parse(rawMd.toString());

  const title = load(html)("h1").text();

  fs.writeFile(
    path.join(pagesDir, file.replace(".md", ".html")),
    TEMPLATE(title, html),
  );
  log.info("success");
}
