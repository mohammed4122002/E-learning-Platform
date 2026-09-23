#!/usr/bin/env node
/**
 * Downloads the original course-cover images of the dashboard (Figma frame TRN-DSH-01)
 * into public/assets/images/. The cover component picks them up automatically.
 *
 * Usage: FIGMA_TOKEN=<personal access token> npm run fetch:covers
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE_KEY = "xJo3iXyJRn6ZyxdT7rKuNP";

// Image-fill hashes of the six "Media / Image Placeholder" nodes in the frame.
const COVERS = {
  "506318c516b6472f074f0b8406e2b4d8505c8d57": "continue-project-management", // 562:23228
  "9a7388b1107fc452eaba92dd10f3ac994057c360": "continue-business-administration", // 562:23287
  "476497d7e0979283111998819d73f04d67835d9c": "continue-design", // 562:23169
  "5d21ebeb7db9dee15d4a48c277381ab43833f06b": "recommended-web-development", // 562:23043
  "7f1baeeb11194dc3b60eeb659fb0a63bbdd9d85e": "recommended-effective-leadership", // 562:23053
  "712209b9f794e01a28d06ffa9e0a4e7d6caf72e4": "recommended-financial-leadership", // 562:23111
};

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const token = process.env.FIGMA_TOKEN;
if (!token) {
  console.error("Set FIGMA_TOKEN to a Figma personal access token.");
  process.exit(1);
}

const res = await fetch(`https://api.figma.com/v1/files/${FILE_KEY}/images`, {
  headers: { "X-Figma-Token": token },
});
if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
const { meta } = await res.json();

const outDir = path.join(process.cwd(), "public", "assets", "images");
await mkdir(outDir, { recursive: true });

for (const [hash, name] of Object.entries(COVERS)) {
  const url = meta.images[hash];
  if (!url) throw new Error(`Image ${hash} (${name}) not found in the file`);
  const image = await fetch(url);
  if (!image.ok) throw new Error(`Download failed for ${name}: ${image.status}`);
  const ext = EXTENSIONS[image.headers.get("content-type")] ?? "png";
  await writeFile(path.join(outDir, `${name}.${ext}`), Buffer.from(await image.arrayBuffer()));
  console.log(`saved public/assets/images/${name}.${ext}`);
}
