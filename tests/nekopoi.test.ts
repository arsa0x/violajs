import { describe, expect, it } from "bun:test";
import { writeFileSync } from "node:fs";
import type { BotConfig } from "@/src/types/config";
import { Nekopoi } from "@lib/nekopoi";

// Bun loads .env automatically. Required variables:
//   NEKOPOI_BASE, NEKOPOI_PATHS, NEKOPOI_BUILD_CODE,
//   NEKOPOI_SIGNATURE, NEKOPOI_UA, NEKOPOI_TOKEN
const env = process.env;
const missing = [
  "NEKOPOI_BASE",
  "NEKOPOI_PATHS",
  "NEKOPOI_BUILD_CODE",
  "NEKOPOI_SIGNATURE",
  "NEKOPOI_USER_AGENT",
  "NEKOPOI_TOKEN",
].filter((k) => !env[k]);

if (missing.length) {
  throw new Error(`Missing env vars: ${missing.join(", ")}`);
}

const api = new Nekopoi({
  nekopoi_base: env.NEKOPOI_BASE,
  nekopoi_paths: env.NEKOPOI_PATHS,
  nekopoi_build_code: env.NEKOPOI_BUILD_CODE,
  nekopoi_signature: env.NEKOPOI_SIGNATURE,
  nekopoi_user_agent: env.NEKOPOI_USER_AGENT,
  nekopoi_token: env.NEKOPOI_TOKEN,
} as BotConfig);

// Everything printed is also saved here so it can be pasted in one go.
const dump: Record<string, unknown> = {};

// Long arrays are cut to 3 items so the output stays readable.
function show(label: string, data: unknown) {
  const cut = (_: string, v: unknown) =>
    Array.isArray(v) && v.length > 3
      ? [...v.slice(0, 3), `...(${v.length - 3} more)`]
      : v;
  dump[label] = JSON.parse(JSON.stringify(data, cut));
  console.log(`\n===== ${label} =====\n${JSON.stringify(data, cut, 2)}\n`);
}

// Raw request so we can see exactly what the server said.
async function probe(path: string, queries?: Record<string, any>) {
  const url = api.buildUrl(path, queries);
  const res = await api.nekofetch(path, queries);
  const text = await res.text();
  console.log(
    `\n[${res.status}] ${url}\ncontent-type: ${res.headers.get("content-type")}`,
  );
  return { res, text };
}

describe("Nekopoi: real server", () => {
  it("search", async () => {
    const { res, text } = await probe("/search", { q: "a", page: 1 });
    expect(res.status).toBe(200);
    const json = JSON.parse(text);
    show("search", json);
    expect(typeof json.total).toBe("number");
    expect(typeof json.totalPages).toBe("number");
  });

  it("genres", async () => {
    const res = await api.genres();
    show("genres", res);
    expect(res.data.length).toBeGreaterThan(0);
  });

  it("recent", async () => {
    const res = await api.recent();
    show("recent", res);
    expect(Array.isArray(res.carousel)).toBe(true);
    expect(Array.isArray(res.posts)).toBe(true);
  });

  it("all (category 2)", async () => {
    const res = await api.all(2, 1);
    show("all", res);
    expect(res.total).toBeGreaterThanOrEqual(0);
  });

  it("series + post from real search results", async () => {
    const found = await api.search("a", 1);
    const post = found.result?.find((r) => r.type === "post");
    const series = found.result?.find((r) => r.type !== "post");

    if (series) {
      const s = await api.series(series.id);
      show(`series (type=${series.type}, id=${series.id})`, s);
      expect(s.id).toBe(series.id);
    } else {
      console.log("No non-post result found in search, series not tested");
    }

    expect(post).toBeDefined();
    const p = await api.post(post!.id);
    show(`post (id=${post!.id})`, p);
    expect(p.id).toBe(post!.id);
  });

  it("saves everything to nekopoi-output.json", () => {
    writeFileSync("dev/nekopoi-output.json", JSON.stringify(dump, null, 2));
    console.log("\nSaved to dev/nekopoi-output.json");
  });
});
