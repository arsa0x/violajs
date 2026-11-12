import { marked } from "marked";
import fs from "fs/promises";
import path from "path";
import { load } from "cheerio";

const docsDir = path.resolve("docs");
const pagesDir = path.resolve("site", "pages");

const DOC_DESCRIPTIONS: Record<string, string> = {
  "argument-parser.md": "Parse command arguments, aliases, and flags.",
  "commands.md": "Available commands, aliases, usage, and flags.",
  "events.md": "Listen to internal and raw Baileys events.",
  "interactive-messages.md": "Build buttons, lists, and carousel messages.",
  "scraper-commands.md": "Downloader, search, and metadata commands.",
  "menu-command.md": "Create an interactive command menu.",
};

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
}

function createRenderer() {
  const renderer = new marked.Renderer();
  const renderRawHtml = (token: { text: string }) => {
    const value = token.text.trim();
    if (/^<br\s*\/?\s*>$/i.test(value)) return "<br>";
    if (/^<!--[\s\S]*-->$/.test(value)) return "";
    return escapeHtml(token.text);
  };

  renderer.html = renderRawHtml;
  return renderer;
}

function addHeadingIds(html: string) {
  const $ = load(html);
  const used = new Map<string, number>();
  const toc: Array<{ id: string; title: string; level: number }> = [];

  $("h1, h2, h3").each((_, element) => {
    const heading = $(element);
    const title = heading.text().trim();
    const base = slugify(title) || "section";
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    heading.attr("id", id);
    const level = Number(element.tagName.slice(1));
    if (level > 1) toc.push({ id, title, level });
  });

  return { html: $("body").html() ?? $.root().html() ?? html, toc };
}

function renderSidebar(files: string[], currentFile: string, titles: Map<string, string>) {
  return files.map((file, index) => {
    const active = file === currentFile;
    const title = titles.get(file) ?? file.replace(/\.md$/, "");
    return `<a class="docs-nav-link${active ? " is-active" : ""}" href="./${file.replace(/\.md$/, ".html")}"${active ? ' aria-current="page"' : ""}><span class="docs-nav-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(title)}</span></a>`;
  }).join("\n");
}

function renderToc(items: Array<{ id: string; title: string; level: number }>) {
  if (!items.length) return "";
  return `<aside class="docs-toc" aria-label="On this page"><p class="docs-toc-title">ON THIS PAGE</p><nav>${items.map((item) => `<a class="toc-level-${item.level}" href="#${encodeURIComponent(item.id)}">${escapeHtml(item.title)}</a>`).join("")}</nav></aside>`;
}

function template(title: string, file: string, files: string[], titles: Map<string, string>, content: string, toc: Array<{ id: string; title: string; level: number }>) {
  const description = DOC_DESCRIPTIONS[file] ?? "Read the violajs documentation.";
  const sidebar = renderSidebar(files, file, titles);
  const tocMarkup = renderToc(toc);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f8f7fc" />
    <meta name="description" content="${escapeHtml(description)}" />
    <script>
      (() => {
        try {
          const saved = localStorage.getItem("violajs-theme");
          const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (saved === "dark" || (!saved && prefersDark)) document.documentElement.dataset.theme = "dark";
        } catch {}
      })();
    </script>
    <title>${escapeHtml(title)} — violajs docs</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../style.css" />
  </head>
  <body class="docs-page">
    <header class="site-header">
      <nav class="nav container" aria-label="Main navigation">
        <a class="brand" href="../index.html" aria-label="violajs home">
          <span class="brand-mark">v<span>.</span></span><span>viola<span class="brand-light">js</span></span>
        </a>
        <button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false"><span></span><span></span></button>
        <div class="nav-links" id="nav-links">
          <a href="../index.html#features">Features</a>
          <a href="../index.html#getting-started">Getting started</a>
          <a href="../index.html#plugins">Plugins</a>
          <a class="is-current" href="./${file.replace(/\.md$/, ".html")}">Documentation</a>
          <button class="theme-toggle" type="button" aria-label="Switch to dark mode" aria-pressed="false"><span class="theme-icon" aria-hidden="true">☾</span><span class="theme-label">Dark mode</span></button>
          <a class="nav-github" href="https://github.com/arsa0x/violajs" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </nav>
    </header>

    <div class="docs-shell container">
      <aside class="docs-sidebar">
        <a class="docs-back-link" href="../index.html">← Back to overview</a>
        <p class="docs-sidebar-label">DOCUMENTATION</p>
        <nav class="docs-nav" aria-label="Documentation pages">${sidebar}</nav>
        <a class="docs-source-link" href="https://github.com/arsa0x/violajs/tree/main/docs" target="_blank" rel="noreferrer">Edit documentation on GitHub ↗</a>
      </aside>

      <main class="docs-main">
        <div class="docs-breadcrumb"><a href="../index.html">Home</a><span>/</span><span>Documentation</span><span>/</span><strong>${escapeHtml(title)}</strong></div>
        <div class="docs-article-layout">
          <article class="docs-content markdown-body">
            ${content}
            <nav class="docs-page-footer" aria-label="Documentation source">
              <span>Found a mistake?</span>
              <a href="https://github.com/arsa0x/violajs/edit/main/docs/${encodeURIComponent(file)}" target="_blank" rel="noreferrer">Suggest an edit ↗</a>
            </nav>
          </article>
          ${tocMarkup}
        </div>
      </main>
    </div>

    <footer class="footer">
      <div class="container footer-inner">
        <a class="brand" href="../index.html"><span class="brand-mark">v<span>.</span></span><span>viola<span class="brand-light">js</span></span></a>
        <p>Made with care, powered by <a href="https://github.com/WhiskeySockets/Baileys" target="_blank" rel="noreferrer">Baileys</a> & <a href="https://bun.sh" target="_blank" rel="noreferrer">Bun</a>.</p>
        <span class="footer-copy">© <span id="year"></span> violajs</span>
      </div>
    </footer>
    <script src="../script.js"></script>
  </body>
</html>`;
}

await fs.mkdir(pagesDir, { recursive: true });
const mdFiles = (await fs.readdir(docsDir)).filter((file) => file.endsWith(".md")).sort();
const titles = new Map<string, string>();

for (const file of mdFiles) {
  const markdown = await fs.readFile(path.join(docsDir, file), "utf8");
  const parsed = await marked.parse(markdown, { renderer: createRenderer() });
  const $ = load(parsed);
  const title = $("h1").first().text().trim() || file.replace(/\.md$/, "");
  titles.set(file, title);
}

for (const file of mdFiles) {
  const markdown = await fs.readFile(path.join(docsDir, file), "utf8");
  const parsed = await marked.parse(markdown, { renderer: createRenderer() });
  const { html, toc } = addHeadingIds(parsed);
  const title = titles.get(file) ?? file.replace(/\.md$/, "");
  const output = template(title, file, mdFiles, titles, html, toc);
  await fs.writeFile(path.join(pagesDir, file.replace(/\.md$/, ".html")), output, "utf8");
  console.info(`Generated site/pages/${file.replace(/\.md$/, ".html")}`);
}

console.info(`Generated ${mdFiles.length} documentation pages.`);
