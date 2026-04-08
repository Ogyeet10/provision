import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expandArchive } from "../../../helpers/windows/archive.ts";
import { createStartMenuShortcut } from "../../../helpers/windows/startMenu.ts";
import type { InstallTask } from "../types.ts";
import type { InstallCallbacks } from "./types.ts";

const TRANSLUCENT_TB_URL =
  "https://github.com/TranslucentTB/TranslucentTB/releases/download/2026.1/TranslucentTB-portable-x64.zip";
const TRANSLUCENT_TB_EXECUTABLE = "TranslucentTB.exe";

export async function installTranslucentTB(task: InstallTask, callbacks: InstallCallbacks) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "provision-translucent-tb-"));
  const zipPath = path.join(tempRoot, "TranslucentTB-portable-x64.zip");
  const extractDir = path.join(tempRoot, "extract");

  try {
    callbacks.log(`${task.name}: downloading portable package`);
    callbacks.update("downloading", 10);

    const response = await fetch(TRANSLUCENT_TB_URL);

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}.`);
    }

    await Bun.write(zipPath, response);

    if (callbacks.isCancelled()) {
      return;
    }

    callbacks.update("downloading", 42);
    callbacks.log(`${task.name}: extracting portable files`);
    callbacks.update("extracting", 50);

    await mkdir(extractDir, { recursive: true });
    await expandArchive(zipPath, extractDir);

    if (callbacks.isCancelled()) {
      return;
    }

    callbacks.update("extracting", 76);
    callbacks.log(`${task.name}: installing portable files`);
    callbacks.update("installing", 84);

    await rm(task.installPath, { recursive: true, force: true });
    await cp(extractDir, task.installPath, { recursive: true, force: true });

    if (callbacks.isCancelled()) {
      return;
    }

    const executablePath = path.win32.join(task.installPath, TRANSLUCENT_TB_EXECUTABLE);

    callbacks.log(`${task.name}: creating Start Menu shortcut`);
    callbacks.update("installing", 94);

    await createStartMenuShortcut({
      name: "TranslucentTB",
      targetPath: executablePath,
      description: "Launch TranslucentTB",
      folder: "Provision",
      location: "common",
      workingDirectory: task.installPath,
      iconPath: executablePath,
    });

    callbacks.update("installing", 99);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
