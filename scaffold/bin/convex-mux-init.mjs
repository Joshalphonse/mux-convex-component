#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

console.warn(
  "\x1b[33m[DEPRECATED]\x1b[0m convex-mux-init is deprecated. Use \x1b[1mnpx @mux/convex init\x1b[0m instead.\n",
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { runInit } = await import(
  path.join(__dirname, "..", "..", "bin", "init.mjs")
);

runInit(process.argv.slice(2));
