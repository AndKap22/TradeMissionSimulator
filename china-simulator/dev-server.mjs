import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

createServer(async (request, response) => {
  const path = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const safePath = normalize(path).replace(/^(\.\.(\/|\\|$))+/, "");
  try {
    let body = await readFile(join(root, safePath));
    if (safePath === "/index.html") body = Buffer.from(body.toString().replaceAll("{{ORIGIN}}", `http://localhost:${port}`));
    response.writeHead(200, { "content-type": types[extname(safePath)] || "application/octet-stream", "cache-control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Страница не найдена");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Local URL: http://127.0.0.1:${port}`);
});
