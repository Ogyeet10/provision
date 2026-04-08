import { mkdir } from "node:fs/promises";
import path from "node:path";
import { runPowerShellCommand } from "./powershell.ts";

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

  const requestedLocation: StartMenuShortcutLocation = options.location ?? "common";
  const locations: StartMenuShortcutLocation[] =
    requestedLocation === "common" ? ["common", "user"] : [requestedLocation];
  let lastError: unknown;

  for (const location of locations) {
    try {
      return await createStartMenuShortcutAtLocation(options, location);
    } catch (error) {
      lastError = error;

      if (location !== "common" || !isPermissionError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to create Start Menu shortcut for ${options.name}.`);
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

async function createStartMenuShortcutAtLocation(
  options: CreateStartMenuShortcutOptions,
  location: StartMenuShortcutLocation,
) {
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

  await runPowerShellCommand({
    command,
    env: {
      PROVISION_SHORTCUT_PATH: shortcutPath,
      PROVISION_TARGET_PATH: options.targetPath,
      PROVISION_ARGUMENTS: options.arguments ?? "",
      PROVISION_DESCRIPTION: options.description ?? "",
      PROVISION_ICON_PATH: options.iconPath ?? "",
      PROVISION_WORKING_DIRECTORY: options.workingDirectory ?? path.win32.dirname(options.targetPath),
    },
    errorMessage: `Failed to create Start Menu shortcut for ${options.name}.`,
  });

  return shortcutPath;
}

function isPermissionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /EPERM|EACCES|access is denied|permission/i.test(error.message);
}
