import { INSTALL_OPTIONS } from "./data.ts";
import type { InstallPhase, InstallTask } from "./types.ts";

export function buildSelectOptions(selectedIds: Set<string>) {
  return INSTALL_OPTIONS.map((option) => ({
    name: `${selectedIds.has(option.id) ? "[x]" : "[ ]"} ${option.name}`,
    description: option.description,
    value: option.id,
  }));
}

export function buildSelectedList(selectedIds: Set<string>) {
  const selected = INSTALL_OPTIONS.filter((option) => selectedIds.has(option.id));

  if (selected.length === 0) {
    return "Queued installs:\n- none yet";
  }

  return `Queued installs:\n${selected
    .map((option) => `- ${option.name}\n  ${option.installPath}`)
    .join("\n")}`;
}

export function buildCurrentOperation(tasks: InstallTask[]) {
  const activeTask = tasks.find((task) => task.phase !== "queued" && task.phase !== "completed");

  if (activeTask) {
    return `Current operation: ${activeTask.phase} ${activeTask.name}`;
  }

  const pendingTask = tasks.find((task) => task.phase === "queued");

  if (pendingTask) {
    return `Current operation: queued ${pendingTask.name}`;
  }

  return "Current operation: idle";
}

export function buildActivityLog(entries: string[]) {
  return `Recent activity:\n${entries.join("\n")}`;
}

export function getOverallProgress(tasks: InstallTask[]) {
  if (tasks.length === 0) {
    return 0;
  }

  const total = tasks.reduce((sum, task) => sum + task.progress, 0);
  return total / tasks.length;
}

export function getPhaseColor(phase: InstallPhase) {
  switch (phase) {
    case "queued":
      return "#475569";
    case "downloading":
      return "#38bdf8";
    case "extracting":
      return "#f59e0b";
    case "installing":
      return "#a78bfa";
    case "completed":
      return "#22c55e";
  }
}

export function getCurrentStageProgress(task: InstallTask) {
  if (task.phase === "queued") {
    return 0;
  }

  if (task.phase === "downloading") {
    return clamp((task.progress / 42) * 100);
  }

  if (task.phase === "extracting") {
    return clamp(((task.progress - 42) / (76 - 42)) * 100);
  }

  if (task.phase === "installing") {
    return clamp(((task.progress - 76) / (100 - 76)) * 100);
  }

  return 100;
}

export function buildCurrentStageLabel(task: InstallTask) {
  const percent = getCurrentStageProgress(task).toFixed(0);

  if (task.phase === "queued") {
    return "Queued 0%";
  }

  if (task.phase === "completed") {
    return "Completed 100%";
  }

  const label =
    task.phase === "downloading"
      ? "Download"
      : task.phase === "extracting"
        ? "Extract"
        : "Install";

  return `${label} ${percent}%`;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function formatClock() {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, "0");
  const minutes = `${now.getMinutes()}`.padStart(2, "0");
  const seconds = `${now.getSeconds()}`.padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
