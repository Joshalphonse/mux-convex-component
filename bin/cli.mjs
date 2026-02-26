#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const subcommand = args[0];

function getVersion() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  );
  return pkg.version;
}

function printHelp() {
  console.log(`@mux/convex CLI v${getVersion()}

Usage:
  npx @mux/convex <command> [options]

Commands:
  init    Scaffold app-level Convex wrappers for @mux/convex

Options:
  --help, -h       Show this help message
  --version, -v    Show version number
`);
}

if (!subcommand || subcommand === "--help" || subcommand === "-h") {
  printHelp();
  process.exit(0);
}

if (subcommand === "--version" || subcommand === "-v") {
  console.log(getVersion());
  process.exit(0);
}

if (subcommand === "init") {
  const { runInit } = await import("./init.mjs");
  runInit(args.slice(1));
} else {
  console.error(`Unknown command: ${subcommand}\n`);
  printHelp();
  process.exit(1);
}
