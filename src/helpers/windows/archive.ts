import { runPowerShellCommand } from "./powershell.ts";

export async function expandArchive(zipPath: string, destinationPath: string) {
  await runPowerShellCommand({
    command:
      "Expand-Archive -LiteralPath $env:PROVISION_ZIP_PATH -DestinationPath $env:PROVISION_EXTRACT_PATH -Force",
    env: {
      PROVISION_ZIP_PATH: zipPath,
      PROVISION_EXTRACT_PATH: destinationPath,
    },
    errorMessage: "Failed to expand archive.",
  });
}
