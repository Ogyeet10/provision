import { mkdir } from "node:fs/promises";
import path from "node:path";

export type StartMenuShortcutLocation = "common" | "user";

export type CreateStartMenuShortcutOptions = {
  name: string;
  targetPath: string;
  arguments?: string;
  description?: string;
  iconPath?: string;
  workingDirectory?: string;
  folder?: string;
  location?: StartMenuShortcutLocation;
};

export async function createStartMenuShortcut(options: CreateStartMenuShortcutOptions) {
  ensureWindows();

  const location = options.location ?? "common";
  const programsDirectory = getStartMenuProgramsDirectory(location);
  const shortcutDirectory = options.folder
    ? path.win32.join(programsDirectory, options.folder)
    : programsDirectory;
  const shortcutPath = path.win32.join(shortcutDirectory, `${options.name}.lnk`);

  await mkdir(shortcutDirectory, { recursive: true });

  const command = [
    "$shell = New-Object -ComObject WScript.Shell",
    "$shortcut = $shell.CreateShortcut($env:PROVISION_SHORTCUT_PATH)",
    "$shortcut.TargetPath = $env:PROVISION_TARGET_PATH",
    "if ($env:PROVISION_ARGUMENTS) { $shortcut.Arguments = $env:PROVISION_ARGUMENTS }",
    "if ($env:PROVISION_DESCRIPTION) { $shortcut.Description = $env:PROVISION_DESCRIPTION }",
    "if ($env:PROVISION_ICON_PATH) { $shortcut.IconLocation = $env:PROVISION_ICON_PATH }",
    "if ($env:PROVISION_WORKING_DIRECTORY) { $shortcut.WorkingDirectory = $env:PROVISION_WORKING_DIRECTORY }",
    "$shortcut.Save()",
  ].join("; ");

  const proc = Bun.spawn(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command], {
    env: {
      ...process.env,
      PROVISION_SHORTCUT_PATH: shortcutPath,
      PROVISION_TARGET_PATH: options.targetPath,
      PROVISION_ARGUMENTS: options.arguments ?? "",
      PROVISION_DESCRIPTION: options.description ?? "",
      PROVISION_ICON_PATH: options.iconPath ?? "",
      PROVISION_WORKING_DIRECTORY:
        options.workingDirectory ?? path.win32.dirname(options.targetPath),
    },
    stdout: "ignore",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const errorText = await new Response(proc.stderr).text();
    throw new Error(errorText.trim() || `Failed to create Start Menu shortcut for ${options.name}.`);
  }

  return shortcutPath;
}

export function getStartMenuProgramsDirectory(location: StartMenuShortcutLocation = "common") {
  ensureWindows();

  if (location === "common") {
    const programData = process.env.ProgramData;

    if (!programData) {
      throw new Error("ProgramData is not set.");
    }

    return path.win32.join(programData, "Microsoft", "Windows", "Start Menu", "Programs");
  }

  const appData = process.env.APPDATA;

  if (!appData) {
    throw new Error("APPDATA is not set.");
  }

  return path.win32.join(appData, "Microsoft", "Windows", "Start Menu", "Programs");
}

function ensureWindows() {
  if (process.platform !== "win32") {
    throw new Error("Start Menu shortcuts are only supported on Windows.");
  }
}
