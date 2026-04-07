import { runSetupUi } from "./commands/setup/runSetupUi.ts";

export async function runCli(args: string[]) {
  const [command] = args;

  switch (command) {
    case "setup":
      await runSetupUi();
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      printUsage();
      break;
    default:
      console.error(`Unknown subcommand: ${command}`);
      printUsage(1);
  }
}

function printUsage(exitCode = 0) {
  const output = exitCode === 0 ? console.log : console.error;

  output(`Usage: provision <subcommand>

Subcommands:
  setup    Run the Windows setup selector in the current terminal
  help     Show this message`);

  process.exit(exitCode);
}
