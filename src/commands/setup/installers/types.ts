import type { InstallPhase, InstallTask } from "../types.ts";

export type InstallCallbacks = {
  log: (message: string) => void;
  update: (phase: InstallPhase, progress: number) => void;
  isCancelled: () => boolean;
};

export type Installer = (task: InstallTask, callbacks: InstallCallbacks) => Promise<void>;
