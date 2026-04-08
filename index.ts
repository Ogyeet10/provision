#!/usr/bin/env bun

import { mkdirSync } from "node:fs";
import path from "node:path";

// Bun extracts embedded native libraries (like opentui.dll) to a temp directory.
// On locked-down Windows environments the default temp path blocks DLL execution.
// Redirect Bun's temp to a path under ProgramData that we control.
if (process.platform === "win32") {
  const provisionTmp = path.join(
    process.env.ProgramData ?? "C:\\ProgramData",
    "Provision",
    "tmp",
  );

  try {
    mkdirSync(provisionTmp, { recursive: true });
  } catch {
    // best-effort; fall through to default temp if mkdir fails
  }

  process.env.BUN_TMPDIR = provisionTmp;
}

// Dynamic import so BUN_TMPDIR is set before OpenTUI's native library loads.
const { runCli } = await import("./src/cli.ts");
await runCli(Bun.argv.slice(2));
