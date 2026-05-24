import { build } from "./build.ts";

const outputDir = "html";
const port = 8080;
const clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

await build();
watchAndRebuild();

Deno.serve({ hostname: "127.0.0.1", port }, async (request) => {
  const url = new URL(request.url);

  if (url.pathname === "/__reload") {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        clients.add(controller);
        controller.enqueue(encoder.encode("retry: 1000\n\n"));
      },
      cancel(controller) {
        clients.delete(controller);
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "connection": "keep-alive",
      },
    });
  }

  const file = await readStaticFile(url.pathname);
  if (!file) return new Response("Not found", { status: 404 });

  const body = file.contentType === "text/html"
    ? injectReload(decoder.decode(file.content))
    : toArrayBuffer(file.content);

  return new Response(body, {
    headers: { "content-type": file.contentType },
  });
});

console.log(`Serving http://127.0.0.1:${port}`);

function watchAndRebuild() {
  let timer: ReturnType<typeof setTimeout> | undefined;

  (async () => {
    for await (const event of Deno.watchFs(["content", "layouts", "static"])) {
      if (event.kind === "access") continue;

      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await build();
          reloadBrowsers();
        } catch (error) {
          console.error(error);
        }
      }, 50);
    }
  })();
}

async function readStaticFile(
  pathname: string,
): Promise<{ content: Uint8Array; contentType: string } | undefined> {
  const path = resolvePath(pathname);
  try {
    const stat = await Deno.stat(path);
    if (stat.isDirectory) {
      return await readStaticFile(`${pathname.replace(/\/$/, "")}/index.html`);
    }
    const contentType = contentTypeFor(path);
    return { content: await Deno.readFile(path), contentType };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return undefined;
    throw error;
  }
}

function resolvePath(pathname: string): string {
  const decoded = decodeURIComponent(pathname);
  const clean = decoded.split("/").filter((part) => part && part !== "..").join(
    "/",
  );
  return `${outputDir}/${clean || "index.html"}`;
}

function contentTypeFor(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".css")) return "text/css";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".ico")) return "image/x-icon";
  if (path.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function injectReload(content: string): string {
  const script =
    `<script>new EventSource("/__reload").onmessage = () => location.reload();</script>`;
  return content.includes("</body>")
    ? content.replace("</body>", `${script}</body>`)
    : `${content}${script}`;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function reloadBrowsers() {
  const message = encoder.encode("data: reload\n\n");
  for (const client of clients) {
    try {
      client.enqueue(message);
    } catch {
      clients.delete(client);
    }
  }
}
