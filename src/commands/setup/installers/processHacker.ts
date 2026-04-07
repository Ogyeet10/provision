import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expandArchive } from "../../../helpers/windows/archive.ts";
import { createStartMenuShortcut } from "../../../helpers/windows/startMenu.ts";
import type { InstallTask } from "../types.ts";
import type { InstallCallbacks } from "./types.ts";

const PROCESS_HACKER_URL = "https://aide-s3.geekgenius.onl:8443/aidans-cdn/process-hacker.zip";
const PROCESS_HACKER_EXECUTABLE = "processhacker.exe";

export async function installProcessHacker(task: InstallTask, callbacks: InstallCallbacks) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "provision-process-hacker-"));
  const zipPath = path.join(tempRoot, "process-hacker.zip");
  const extractDir = path.join(tempRoot, "extract");

  try {
    callbacks.log(`${task.name}: downloading package payload`);
    callbacks.update("downloading", 10);

    const response = await fetch(PROCESS_HACKER_URL);

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}.`);
    }

    await Bun.write(zipPath, response);

    if (callbacks.isCancelled()) {
      return;
    }

    callbacks.update("downloading", 42);
    callbacks.log(`${task.name}: extracting x64 bundle`);
    callbacks.update("extracting", 50);

    await mkdir(extractDir, { recursive: true });
    await expandArchive(zipPath, extractDir);

    if (callbacks.isCancelled()) {
      return;
    }

    const sourceDir = path.join(extractDir, "x64");

    callbacks.update("extracting", 76);
    callbacks.log(`${task.name}: copying files into ${task.installPath}`);
    callbacks.update("installing", 84);

    await rm(task.installPath, { recursive: true, force: true });
    await cp(sourceDir, task.installPath, { recursive: true, force: true });

    if (callbacks.isCancelled()) {
      return;
    }

    callbacks.log(`${task.name}: creating Start Menu shortcut`);
    callbacks.update("installing", 94);

    await createStartMenuShortcut({
      name: "Process Hacker",
      targetPath: path.win32.join(task.installPath, PROCESS_HACKER_EXECUTABLE),
      description: "Launch Process Hacker",
      folder: "Provision",
      location: "common",
      workingDirectory: task.installPath,
      iconPath: path.win32.join(task.installPath, PROCESS_HACKER_EXECUTABLE),
    });

    callbacks.update("installing", 99);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}
