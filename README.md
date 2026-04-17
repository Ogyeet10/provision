# provision

## Development

Install dependencies:

```bash
bun install
```

Run the app:

```bash
bun run provision --help
```

Run the setup UI:

```bash
bun run provision setup
```

## Windows Install Script

Install the latest released Provision binary and add it to `PATH`:

```powershell
irm https://raw.githubusercontent.com/Ogyeet10/provision/master/scripts/install-provision.ps1?cahcebegone=144 -OutFile $env:TEMP\install-provision.ps1; & $env:TEMP\install-provision.ps1;
```
