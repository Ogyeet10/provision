export async function expandArchive(zipPath: string, destinationPath: string) {
  const command = "Expand-Archive -LiteralPath $env:PROVISION_ZIP_PATH -DestinationPath $env:PROVISION_EXTRACT_PATH -Force";

  const proc = Bun.spawn(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command], {
    env: {
      ...process.env,
      PROVISION_ZIP_PATH: zipPath,
      PROVISION_EXTRACT_PATH: destinationPath,
    },
    stdout: "ignore",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const errorText = await new Response(proc.stderr).text();
    throw new Error(errorText.trim() || "Failed to expand archive.");
  }
}
