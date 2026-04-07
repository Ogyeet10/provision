import { cp, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expandArchive } from "../../../helpers/windows/archive.ts";
import { createStartMenuShortcut } from "../../../helpers/windows/startMenu.ts";
import type { InstallTask } from "../types.ts";
import type { InstallCallbacks } from "./types.ts";

const UNGOOGLED_CHROMIUM_URL =
  "https://github.com/ungoogled-software/ungoogled-chromium-windows/releases/download/146.0.7680.177-1.1/ungoogled-chromium_146.0.7680.177-1.1_windows_x64.zip";

const EXECUTABLE_CANDIDATES = ["chrome.exe", "chromium.exe", "ungoogled-chromium.exe"];

export async function installUngoogledChromium(task: InstallTask, callbacks: InstallCallbacks) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "provision-ungoogled-chromium-"));
  const zipPath = path.join(tempRoot, "ungoogled-chromium.zip");
  const extractDir = path.join(tempRoot, "extract");

  try {
    callbacks.log(`${task.name}: downloading browser package`);
    callbacks.update("downloading", 10);

    const response = await fetch(UNGOOGLED_CHROMIUM_URL);

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}.`);
    }

    await Bun.write(zipPath, response);

    if (callbacks.isCancelled()) {
      return;
    }

    callbacks.update("downloading", 42);
    callbacks.log(`${task.name}: extracting browser files`);
    callbacks.update("extracting", 50);

    await mkdir(extractDir, { recursive: true });
    await expandArchive(zipPath, extractDir);

    if (callbacks.isCancelled()) {
      return;
    }

    const executablePath = await findBrowserExecutable(extractDir);
    const sourceDir = path.dirname(executablePath);

    callbacks.update("extracting", 76);
    callbacks.log(`${task.name}: installing browser files`);
    callbacks.update("installing", 84);

    await rm(task.installPath, { recursive: true, force: true });
    await cp(sourceDir, task.installPath, { recursive: true, force: true });

    if (callbacks.isCancelled()) {
      return;
    }

    const installedExecutablePath = path.win32.join(task.installPath, path.basename(executablePath));

    callbacks.log(`${task.name}: creating Start Menu shortcut`);
    callbacks.update("installing", 94);

    await createStartMenuShortcut({
      name: "Ungoogled Chromium",
      targetPath: installedExecutablePath,
      description: "An unblocked Chrome-based browser.",
      folder: "Provision",
      location: "common",
      workingDirectory: task.installPath,
      iconPath: installedExecutablePath,
    });

    callbacks.update("installing", 99);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function findBrowserExecutable(rootPath: string): Promise<string> {
  const entries = await collectFiles(rootPath);

  for (const candidate of EXECUTABLE_CANDIDATES) {
    const exactMatch = entries.find((entry) => path.basename(entry).toLowerCase() === candidate);

    if (exactMatch) {
      return exactMatch;
    }
  }

  const fuzzyMatch = entries.find((entry) => /chrome|chromium/i.test(path.basename(entry)) && entry.toLowerCase().endsWith(".exe"));

  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  throw new Error("Could not find a Chromium executable in the extracted archive.");
}

async function collectFiles(rootPath: string): Promise<string[]> {
  const entries = await readdir(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}
