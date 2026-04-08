import type { InstallOption } from "./types.ts";

export const INSTALL_OPTIONS: InstallOption[] = [
  {
    id: "process-hacker",
    name: "Process Hacker",
    description: "Advanced process inspection and system diagnostics tool.",
    installPath: "C:\\ProgramData\\Provision\\ProcessHacker",
    installer: "process-hacker",
  },
  {
    id: "ungoogled-chromium",
    name: "Ungoogled Chromium",
    description: "An unblocked Chrome-based browser.",
    installPath: "C:\\ProgramData\\Provision\\UngoogledChromium",
    installer: "ungoogled-chromium",
  },
  {
    id: "translucent-tb",
    name: "TranslucentTB",
    description: "Portable Windows taskbar customizer.",
    installPath: "C:\\ProgramData\\Provision\\TranslucentTB",
    installer: "translucent-tb",
  },
  {
    id: "tailscale",
    name: "Tailscale",
    description: "Private mesh VPN client.",
    installPath: "C:\\ProgramData\\Provision\\Tailscale",
    installer: "demo",
  },
];
