import type { InstallOption } from "./types.ts";

export const INSTALL_OPTIONS: InstallOption[] = [
  {
    id: "process-hacker",
    name: "Process Hacker",
    description: "Real Windows install from the Provision CDN with a Start Menu shortcut.",
    installPath: "C:\\ProgramData\\Provision\\ProcessHacker",
    installer: "process-hacker",
  },
  {
    id: "unblocked-chrome",
    name: "Unblocked Chrome",
    description: "Chromium-based browser installed under C:\\ProgramData.",
    installPath: "C:\\ProgramData\\Provision\\UnblockedChrome",
    installer: "demo",
  },
  {
    id: "tailscale",
    name: "Tailscale",
    description: "Mesh VPN client installed under C:\\ProgramData.",
    installPath: "C:\\ProgramData\\Provision\\Tailscale",
    installer: "demo",
  },
];
