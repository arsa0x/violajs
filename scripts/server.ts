import { log } from "@/lib/logger";
import { serve } from "bun";
import { watch } from "fs";
import { join } from "path";

const PUBLIC_DIR = "./site";
const PORT = 3000;

const clients = new Set<ReadableStreamDefaultController>();

watch(PUBLIC_DIR, { recursive: true }, (_, filename) => {
  log.info("File changed:", filename);
  for (const client of clients) {
    try {
      client.enqueue("data: reload\n\n");
    } catch {
      clients.delete(client);
    }
  }
});

const reloadScript = `
<script>
  const es = new EventSource('/__reload');
  es.onmessage = () => {
    console.log('[Hot Reloading] Changes detected, reloading...');
    window.location.reload();
  };
</script>
`;

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/__reload") {
      const body = new ReadableStream({
        start(controller) {
          clients.add(controller);
          req.signal.addEventListener("abort", () =>
            clients.delete(controller),
          );
        },
      });
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    let filePath = join(
      PUBLIC_DIR,
      url.pathname === "/" ? "index.html" : url.pathname,
    );
    let file = Bun.file(filePath);

    if (!(await file.exists())) {
      file = Bun.file(join(PUBLIC_DIR, "index.html"));
      if (!(await file.exists()))
        return new Response("Not Found", { status: 404 });
    }

    if (file.type.includes("html")) {
      let html = await file.text();
      html = html.replace("</body>", reloadScript + "</body>");
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    return new Response(file);
  },
});

log.info("Dev server running at http://localhost:", PORT);
