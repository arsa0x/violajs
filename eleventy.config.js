import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import pluginTOC from "eleventy-plugin-toc";

function escapeCode(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("site/assets");
  eleventyConfig.addPassthroughCopy("site/style.css");
  eleventyConfig.addPassthroughCopy("site/script.js");

  eleventyConfig.addCollection("sortedDocs", (collectionApi) => {
    return collectionApi
      .getFilteredByGlob("site/docs/*.md")
      .sort((a, b) => a.fileSlug.localeCompare(b.fileSlug));
  });

  eleventyConfig.addFilter("extractTitle", (content, fallback) => {
    const match = /<h1[^>]*>([\\s\\S]*?)<\\/h1>/i.exec(content || "");
    if (!match) return fallback;
    const rawTitle = match.at(1) || "";
    return rawTitle.replace(/<[^>]+>/g, "").trim() || fallback;
  });

  const mdLib = markdownIt({
    html: true,
    linkify: true,
    highlight: (str, lang) => {
      const language = lang || "plaintext";
      return `<pre class="language-${language}"><code class="language-${language}">${escapeCode(str)}</code></pre>`;
    },
  }).use(markdownItAnchor, {
    level: Array.of(1, 2, 3),
    tabIndex: false,
    slugify: (s) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^\\p{L}\\p{N}]+/gu, "-")
        .replace(/^-|-$/g, ""),
  });

  eleventyConfig.setLibrary("md", mdLib);
  eleventyConfig.addPlugin(pluginTOC, {
    tags: ["h2", "h3"],
    ul: false,
    wrapper: "nav",
  });

  return {
    pathPrefix: process.env.GITHUB_ACTIONS === "true" ? "/violajs/" : "/",
    dir: {
      input: "site",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
  };
}
