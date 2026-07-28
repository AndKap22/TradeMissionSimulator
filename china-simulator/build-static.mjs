import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const [html, styles, app, engine, scenario, catalog, culture, hosting] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("engine.js", root), "utf8"),
  readFile(new URL("scenario.js", root), "utf8"),
  readFile(new URL("product-catalog.js", root), "utf8"),
  readFile(new URL("culture-guide.js", root), "utf8"),
  readFile(new URL(".openai/hosting.json", root), "utf8"),
]);

let socialCardBase64 = "";
try {
  socialCardBase64 = (await readFile(new URL("public/og-v21.png", root))).toString("base64");
} catch {
  // The MVP remains deployable without a social card while the bespoke asset is reviewed.
}

const worker = `
const INDEX_HTML = ${JSON.stringify(html)};
const STYLES = ${JSON.stringify(styles)};
const APP = ${JSON.stringify(app)};
const ENGINE = ${JSON.stringify(engine)};
const SCENARIO = ${JSON.stringify(scenario)};
const CATALOG = ${JSON.stringify(catalog)};
const CULTURE = ${JSON.stringify(culture)};
const OG_IMAGE = ${JSON.stringify(socialCardBase64)};

function headers(contentType, cache = "public, max-age=300") {
  return {
    "content-type": contentType,
    "cache-control": cache,
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
  };
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const head = request.method === "HEAD";

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const page = INDEX_HTML.replaceAll("{{ORIGIN}}", url.origin);
      return new Response(head ? null : page, { status: 200, headers: headers("text/html; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/styles.css") {
      return new Response(head ? null : STYLES, { status: 200, headers: headers("text/css; charset=utf-8") });
    }
    if (url.pathname === "/app.js") {
      return new Response(head ? null : APP, { status: 200, headers: headers("text/javascript; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/engine.js") {
      return new Response(head ? null : ENGINE, { status: 200, headers: headers("text/javascript; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/scenario.js") {
      return new Response(head ? null : SCENARIO, { status: 200, headers: headers("text/javascript; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/product-catalog.js") {
      return new Response(head ? null : CATALOG, { status: 200, headers: headers("text/javascript; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/culture-guide.js") {
      return new Response(head ? null : CULTURE, { status: 200, headers: headers("text/javascript; charset=utf-8", "no-cache") });
    }
    if (url.pathname === "/og-v21.png" && OG_IMAGE) {
      return new Response(head ? null : fromBase64(OG_IMAGE), { status: 200, headers: headers("image/png", "public, max-age=86400") });
    }
    return new Response("Страница не найдена", { status: 404, headers: headers("text/plain; charset=utf-8", "no-cache") });
  },
};
`;

await mkdir(new URL("dist/server/", root), { recursive: true });
await mkdir(new URL("dist/.openai/", root), { recursive: true });
await writeFile(new URL("dist/server/index.js", root), worker);
await writeFile(new URL("dist/.openai/hosting.json", root), hosting);
console.log("Симулятор собран: dist/server/index.js");
