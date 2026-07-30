import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");
const client = resolve(dist, "client");
const server = resolve(dist, "server");

const files = [
  "favicon.ico",
  "index.css",
  "index.html",
  "index.js",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml",
];

const directories = ["es", "estimate", "images"];

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const file of files) {
  await cp(resolve(root, file), resolve(client, file));
}

for (const directory of directories) {
  await cp(resolve(root, directory), resolve(client, directory), {
    recursive: true,
  });
}

const worker = `const INDEX_FILE = "index.html";

function assetUrl(requestUrl) {
  const url = new URL(requestUrl);

  if (url.pathname.endsWith("/")) {
    url.pathname += INDEX_FILE;
  }

  return url;
}

export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response("Static asset binding is unavailable.", {
        status: 503,
      });
    }

    const url = assetUrl(request.url);
    let response = await env.ASSETS.fetch(new Request(url, request));

    if (response.status === 404 && !url.pathname.split("/").pop().includes(".")) {
      url.pathname += "/index.html";
      response = await env.ASSETS.fetch(new Request(url, request));
    }

    return response;
  },
};
`;

await writeFile(resolve(server, "index.js"), worker);
