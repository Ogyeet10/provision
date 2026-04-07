import type { InstallPhase, InstallTask } from "../types.ts";
import type { InstallCallbacks } from "./types.ts";

export async function runDemoInstall(task: InstallTask, callbacks: InstallCallbacks) {
  await runDemoPhase(task, callbacks, "downloading", 42, 8, 18, `${task.name}: downloading package payload`);
  await runDemoPhase(task, callbacks, "extracting", 76, 45, 75, `${task.name}: extracting bundle into ${task.installPath}`);
  await runDemoPhase(task, callbacks, "installing", 99, 78, 99, `${task.name}: finalizing installation files`);
}

async function runDemoPhase(
  task: InstallTask,
  callbacks: InstallCallbacks,
  phase: Exclude<InstallPhase, "queued" | "completed">,
  target: number,
  minStep: number,
  maxStep: number,
  message: string,
) {
  callbacks.log(message);
  callbacks.update(phase, task.progress);

  while (task.progress < target) {
    if (callbacks.isCancelled()) {
      return;
    }

    const increment = randomInt(minStep, maxStep) / 10;
    callbacks.update(phase, Math.min(target, Number((task.progress + increment).toFixed(1))));
    await Bun.sleep(randomInt(90, 180));
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
