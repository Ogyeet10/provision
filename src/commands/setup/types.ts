import type { BoxRenderable, TextRenderable } from "@opentui/core";
import type { ProgressBarRenderable } from "./components/ProgressBarRenderable.ts";

export type InstallOption = {
  id: string;
  name: string;
  description: string;
  installPath: string;
  installer: "demo" | "process-hacker" | "ungoogled-chromium";
};

export type InstallPhase = "queued" | "downloading" | "extracting" | "installing" | "completed";

export type InstallTask = InstallOption & {
  phase: InstallPhase;
  progress: number;
};

export type InstallTaskView = {
  shell: BoxRenderable;
  status: TextRenderable;
  progressLabel: TextRenderable;
  progressBar: ProgressBarRenderable;
  path: TextRenderable;
};
