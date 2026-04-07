$ErrorActionPreference = "Stop"

$ReleaseVersion = "0.1.0"
$DownloadUrl = "https://github.com/Ogyeet10/provision/releases/download/$ReleaseVersion/provision-x64.exe"
$InstallRoot = Join-Path $env:ProgramData "Provision"
$BinDirectory = Join-Path $InstallRoot "bin"
$ExecutablePath = Join-Path $BinDirectory "provision.exe"

function Write-Step {
  param([string] $Message)

  Write-Host "> $Message"
}

function Add-DirectoryToPath {
  param([string] $Directory)

  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $machineEntries = @()

  if ($machinePath) {
    $machineEntries = $machinePath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)
  }

  if ($machineEntries -contains $Directory) {
    return "Machine"
  }

  try {
    $updatedMachinePath = @($machineEntries + $Directory) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $updatedMachinePath, "Machine")
    return "Machine"
  } catch {
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $userEntries = @()

    if ($userPath) {
      $userEntries = $userPath.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)
    }

    if ($userEntries -notcontains $Directory) {
      $updatedUserPath = @($userEntries + $Directory) -join ";"
      [Environment]::SetEnvironmentVariable("Path", $updatedUserPath, "User")
    }

    return "User"
  }
}

Write-Step "Creating install directory at $BinDirectory"
New-Item -ItemType Directory -Path $BinDirectory -Force | Out-Null

Write-Step "Downloading Provision $ReleaseVersion"
Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExecutablePath

Write-Step "Adding $BinDirectory to PATH"
$pathScope = Add-DirectoryToPath -Directory $BinDirectory

$sessionPath = $env:Path.Split(";", [System.StringSplitOptions]::RemoveEmptyEntries)

if ($sessionPath -notcontains $BinDirectory) {
  $env:Path = ($env:Path.TrimEnd(";") + ";" + $BinDirectory).TrimStart(";")
}

Write-Host ""
Write-Host "Provision installed to: $ExecutablePath"
Write-Host "PATH updated at $pathScope scope."
Write-Host "You can now run: provision"
