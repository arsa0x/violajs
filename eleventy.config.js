export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("site/assets/");
  eleventyConfig.addPassthroughCopy("site/style.css");
  eleventyConfig.addPassthroughCopy("site/script.js");

  return {
    dir: {
      input: "site",
      includes: "_includes",
      output: "_site",
    },
  };
}
