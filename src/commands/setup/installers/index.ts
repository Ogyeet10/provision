import type { InstallTask } from "../types.ts";
import { runDemoInstall } from "./demo.ts";
import { installProcessHacker } from "./processHacker.ts";
import { installUngoogledChromium } from "./ungoogledChromium.ts";
import type { InstallCallbacks, Installer } from "./types.ts";

const WINDOWS_INSTALLERS: Record<string, Installer> = {
  "process-hacker": installProcessHacker,
  "ungoogled-chromium": installUngoogledChromium,
};

export async function installTask(task: InstallTask, callbacks: InstallCallbacks) {
  if (process.platform !== "win32") {
    await runDemoInstall(task, callbacks);
    return;
  }

  const installer = WINDOWS_INSTALLERS[task.installer];

  if (!installer) {
    await runDemoInstall(task, callbacks);
    return;
  }

  await installer(task, callbacks);
}

export type { InstallCallbacks } from "./types.ts";
