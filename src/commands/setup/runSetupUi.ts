import {
  BoxRenderable,
  SelectRenderable,
  SelectRenderableEvents,
  TextRenderable,
  createCliRenderer,
} from "@opentui/core";
import { ProgressBarRenderable } from "./components/ProgressBarRenderable.ts";
import { INSTALL_OPTIONS } from "./data.ts";
import {
  buildActivityLog,
  buildCurrentStageLabel,
  buildCurrentOperation,
  buildSelectedList,
  buildSelectOptions,
  formatClock,
  getCurrentStageProgress,
  getOverallProgress,
  getPhaseColor,
} from "./format.ts";
import { installTask } from "./installers/index.ts";
import type { InstallPhase, InstallTask, InstallTaskView } from "./types.ts";

export async function runSetupUi() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    consoleMode: "disabled",
  });

  const selectedIds = new Set<string>();
  let state: "selection" | "installing" | "complete" = "selection";
  let shouldExit = false;
  let selectedTasks: InstallTask[] = [];
  const activityLog: string[] = ["Waiting for package selection."];
  const taskViews = new Map<string, InstallTaskView>();

  const appShell = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    padding: 1,
    flexDirection: "column",
    gap: 1,
  });

  const selectionUi = createSelectionUi(renderer, selectedIds);
  const installerUi = createInstallerUi(renderer, activityLog);

  appShell.add(selectionUi.shell);
  appShell.add(installerUi.shell);
  renderer.root.add(appShell);

  selectionUi.select.focus();
  updateDetails(selectionUi.select.getSelectedIndex());

  selectionUi.select.on(SelectRenderableEvents.SELECTION_CHANGED, (index: number) => {
    updateDetails(index);
  });

  selectionUi.select.on(SelectRenderableEvents.ITEM_SELECTED, (index: number) => {
    toggleSelection(index);
  });

  renderer.keyInput.on("keypress", (key) => {
    if (key.name === "space") {
      toggleSelection(selectionUi.select.getSelectedIndex());
      key.preventDefault();
      key.stopPropagation();
      return;
    }

    if (key.name === "c") {
      if (state !== "selection") {
        return;
      }

      selectedTasks = INSTALL_OPTIONS.filter((option) => selectedIds.has(option.id)).map((option) => ({
        ...option,
        phase: "queued",
        progress: 0,
      }));

      if (selectedTasks.length === 0) {
        selectionUi.selectedCount.content = "Pick at least one program before continuing";
        return;
      }

      state = "installing";
      selectionUi.shell.visible = false;
      installerUi.shell.visible = true;
      buildTaskViews();
      syncInstallText();
      void simulateInstallFlow();
      return;
    }

    if (key.name === "q") {
      shouldExit = true;
      renderer.destroy();
    }
  });

  await new Promise<void>((resolve) => {
    renderer.on("destroy", () => {
      resolve();
    });
  });

  if (shouldExit || selectedTasks.length === 0) {
    return;
  }

  console.log("Install queue:");

  for (const task of selectedTasks) {
    console.log(`- ${task.name} -> ${task.installPath} (${task.phase})`);
  }

  function toggleSelection(index: number) {
    const option = INSTALL_OPTIONS[index];

    if (!option) {
      return;
    }

    if (selectedIds.has(option.id)) {
      selectedIds.delete(option.id);
    } else {
      selectedIds.add(option.id);
    }

    selectionUi.select.options = buildSelectOptions(selectedIds);
    selectionUi.select.selectedIndex = index;
    updateDetails(index);
  }

  function updateDetails(index: number) {
    const option = INSTALL_OPTIONS[index];

    if (!option) {
      return;
    }

    const isSelected = selectedIds.has(option.id);

    selectionUi.selectedCount.content = `${selectedIds.size} program${selectedIds.size === 1 ? "" : "s"} selected`;
    selectionUi.activeName.content = `${isSelected ? "[selected] " : ""}${option.name}`;
    selectionUi.activeDescription.content = option.description;
    selectionUi.activePath.content = `Install path: ${option.installPath}`;
    selectionUi.selectedList.content = buildSelectedList(selectedIds);
  }

  function syncInstallText() {
    installerUi.overallStatus.content =
      state === "complete"
        ? `Completed ${selectedTasks.length} of ${selectedTasks.length} installs`
        : `Installing ${selectedTasks.length} selected program${selectedTasks.length === 1 ? "" : "s"}`;

    const overallValue = getOverallProgress(selectedTasks);
    installerUi.overallProgress.content = `Overall progress ${overallValue.toFixed(0)}%`;
    installerUi.currentOperation.content = buildCurrentOperation(selectedTasks);
    installerUi.activityText.content = buildActivityLog(activityLog);

    for (const task of selectedTasks) {
      const view = taskViews.get(task.id);

      if (!view) {
        continue;
      }

      view.status.content = `${task.name}  ${task.phase.toUpperCase()}`;
      view.progressLabel.content = buildCurrentStageLabel(task);
      view.progressBar.indeterminate = false;
      view.progressBar.value = getCurrentStageProgress(task);
      view.progressBar.fillColor = getPhaseColor(task.phase);
      view.path.content = `Path: ${task.installPath}`;
    }
  }

  async function simulateInstallFlow() {
    renderer.requestLive();
    pushLog(`Starting installer for ${selectedTasks.length} package${selectedTasks.length === 1 ? "" : "s"}.`);
    syncInstallText();

    for (const task of selectedTasks) {
      if (renderer.isDestroyed || shouldExit) {
        break;
      }

      await installTask(task, {
        log: pushLog,
        isCancelled: () => renderer.isDestroyed || shouldExit,
        update: (phase, progress) => {
          task.phase = phase;
          task.progress = progress;
          syncInstallText();
        },
      });

      if (renderer.isDestroyed || shouldExit) {
        break;
      }

      task.phase = "completed";
      task.progress = 100;
      pushLog(`${task.name}: installation completed successfully.`);
      syncInstallText();
      await Bun.sleep(250);
    }

    if (!renderer.isDestroyed && !shouldExit) {
      state = "complete";
      installerUi.overallStatus.content = `Completed ${selectedTasks.length} of ${selectedTasks.length} installs`;
      installerUi.currentOperation.content = "Current operation: idle";
      installerUi.help.content = "Simulation complete. Press q to exit.";
      pushLog("Installer finished all queued tasks.");
      syncInstallText();
    }

    renderer.dropLive();
  }

  function pushLog(message: string) {
    activityLog.unshift(`${formatClock()}  ${message}`);
    activityLog.splice(8);
  }

  function buildTaskViews() {
    for (const child of installerUi.queueList.getChildren()) {
      installerUi.queueList.remove(child.id);
    }

    taskViews.clear();

    for (const task of selectedTasks) {
      const taskShell = new BoxRenderable(renderer, {
        width: "100%",
        borderStyle: "rounded",
        border: true,
        padding: 1,
        flexDirection: "column",
        gap: 1,
      });

      const status = new TextRenderable(renderer, {
        content: `${task.name}  ${task.phase.toUpperCase()}`,
        fg: "#e2e8f0",
      });

      const progressLabel = new TextRenderable(renderer, {
        content: "Queued 0%",
        fg: "#cbd5e1",
      });

      const progressBar = new ProgressBarRenderable(renderer, {
        width: 38,
        value: 0,
        mode: "determinate",
        fillColor: getPhaseColor(task.phase),
      });

      const path = new TextRenderable(renderer, {
        content: `Path: ${task.installPath}`,
        fg: "#94a3b8",
      });

      taskShell.add(status);
      taskShell.add(progressLabel);
      taskShell.add(progressBar);
      taskShell.add(path);
      installerUi.queueList.add(taskShell);
      taskViews.set(task.id, {
        shell: taskShell,
        status,
        progressLabel,
        progressBar,
        path,
      });
    }
  }
}

function createSelectionUi(renderer: Awaited<ReturnType<typeof createCliRenderer>>, selectedIds: Set<string>) {
  const shell = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    gap: 1,
  });

  const header = new BoxRenderable(renderer, {
    borderStyle: "rounded",
    border: true,
    padding: 1,
    flexDirection: "column",
    gap: 1,
  });

  const title = new TextRenderable(renderer, {
    content: "Provision Setup",
    fg: "#7dd3fc",
  });

  const subtitle = new TextRenderable(renderer, {
    content: "Windows-focused provisioning UI. Target install location: C:\\ProgramData.",
    fg: "#cbd5e1",
  });

  const help = new TextRenderable(renderer, {
    content: "Move: Up/Down or j/k | Toggle: Enter or Space | Confirm: c | Quit: q",
    fg: "#94a3b8",
  });

  header.add(title);
  header.add(subtitle);
  header.add(help);

  const content = new BoxRenderable(renderer, {
    flexGrow: 1,
    flexDirection: "row",
    gap: 1,
  });

  const listPanel = new BoxRenderable(renderer, {
    flexGrow: 1,
    width: "55%",
    borderStyle: "rounded",
    border: true,
    padding: 1,
    title: "Install Choices",
    focusedBorderColor: "#7dd3fc",
  });

  const detailsPanel = new BoxRenderable(renderer, {
    flexGrow: 1,
    width: "45%",
    borderStyle: "rounded",
    border: true,
    padding: 1,
    flexDirection: "column",
    gap: 1,
    title: "Details",
  });

  const select = new SelectRenderable(renderer, {
    width: "100%",
    height: "100%",
    showDescription: true,
    wrapSelection: true,
    selectedBackgroundColor: "#1d4ed8",
    selectedTextColor: "#eff6ff",
    selectedDescriptionColor: "#dbeafe",
    focusedBackgroundColor: "#0f172a",
    textColor: "#e2e8f0",
    descriptionColor: "#94a3b8",
    options: buildSelectOptions(selectedIds),
  });

  const selectedCount = new TextRenderable(renderer, {
    content: "0 programs selected",
    fg: "#7dd3fc",
  });

  const activeName = new TextRenderable(renderer, {
    content: INSTALL_OPTIONS[0]?.name ?? "",
    fg: "#f8fafc",
  });

  const activeDescription = new TextRenderable(renderer, {
    content: INSTALL_OPTIONS[0]?.description ?? "",
    fg: "#cbd5e1",
  });

  const activePath = new TextRenderable(renderer, {
    content: `Install path: ${INSTALL_OPTIONS[0]?.installPath ?? ""}`,
    fg: "#94a3b8",
  });

  const selectedList = new TextRenderable(renderer, {
    content: "Queued installs:\n- none yet",
    fg: "#cbd5e1",
  });

  detailsPanel.add(selectedCount);
  detailsPanel.add(activeName);
  detailsPanel.add(activeDescription);
  detailsPanel.add(activePath);
  detailsPanel.add(selectedList);

  listPanel.add(select);
  content.add(listPanel);
  content.add(detailsPanel);

  shell.add(header);
  shell.add(content);

  return { shell, select, selectedCount, activeName, activeDescription, activePath, selectedList };
}

function createInstallerUi(renderer: Awaited<ReturnType<typeof createCliRenderer>>, activityLog: string[]) {
  const shell = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    gap: 1,
    visible: false,
  });

  const header = new BoxRenderable(renderer, {
    borderStyle: "rounded",
    border: true,
    padding: 1,
    flexDirection: "column",
    gap: 1,
  });

  const title = new TextRenderable(renderer, {
    content: "Provision Installer",
    fg: "#7dd3fc",
  });

  const subtitle = new TextRenderable(renderer, {
    content: "Simulating download, extraction, and installation in C:\\ProgramData.",
    fg: "#cbd5e1",
  });

  const help = new TextRenderable(renderer, {
    content: "Press q to exit the installer at any time.",
    fg: "#94a3b8",
  });

  header.add(title);
  header.add(subtitle);
  header.add(help);

  const content = new BoxRenderable(renderer, {
    flexGrow: 1,
    flexDirection: "row",
    gap: 1,
  });

  const queuePanel = new BoxRenderable(renderer, {
    width: "60%",
    flexGrow: 1,
    borderStyle: "rounded",
    border: true,
    padding: 1,
    title: "Install Queue",
  });

  const activityPanel = new BoxRenderable(renderer, {
    width: "40%",
    flexGrow: 1,
    borderStyle: "rounded",
    border: true,
    padding: 1,
    flexDirection: "column",
    gap: 1,
    title: "Status",
  });

  const overallStatus = new TextRenderable(renderer, {
    content: "Preparing installer...",
    fg: "#7dd3fc",
  });

  const overallProgress = new TextRenderable(renderer, {
    content: "Overall progress 0%",
    fg: "#e2e8f0",
  });

  const currentOperation = new TextRenderable(renderer, {
    content: "Current operation: idle",
    fg: "#cbd5e1",
  });

  const queueList = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
    gap: 1,
  });

  const emptyQueueText = new TextRenderable(renderer, {
    content: "No install tasks queued.",
    fg: "#e2e8f0",
  });

  queueList.add(emptyQueueText);

  const activityText = new TextRenderable(renderer, {
    content: buildActivityLog(activityLog),
    fg: "#cbd5e1",
  });

  queuePanel.add(queueList);
  activityPanel.add(overallStatus);
  activityPanel.add(overallProgress);
  activityPanel.add(currentOperation);
  activityPanel.add(activityText);

  content.add(queuePanel);
  content.add(activityPanel);
  shell.add(header);
  shell.add(content);

  return { shell, help, overallStatus, overallProgress, currentOperation, queueList, activityText };
}
