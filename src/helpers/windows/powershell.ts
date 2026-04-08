type RunPowerShellCommandOptions = {
  command: string;
  env?: Record<string, string>;
  errorMessage: string;
};

export async function runPowerShellCommand(options: RunPowerShellCommandOptions) {
  const proc = Bun.spawn(
    [
      "powershell.exe",
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      buildPowerShellCommand(options.command),
    ],
    {
      env: {
        ...process.env,
        ...options.env,
      },
      stdout: "ignore",
      stderr: "pipe",
    },
  );

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const errorText = await new Response(proc.stderr).text();
    throw new Error(errorText.trim() || options.errorMessage);
  }
}

function buildPowerShellCommand(command: string) {
  return [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    command,
  ].join("; ");
}
