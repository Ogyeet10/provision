$ErrorActionPreference = "Stop"

$DownloadUrl = "https://github.com/Ogyeet10/provision/releases/latest/download/provision-x64.exe"
$InstallRoot = Join-Path $env:ProgramData "Provision"
$BinDirectory = Join-Path $InstallRoot "bin"
$ExecutablePath = Join-Path $BinDirectory "provision.exe"

function Write-Step {
  param([string] $Message)

  Write-Host "> $Message"
}

function Add-DirectoryToPath {
  param([string] $Directory)

  $machineKey = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
  $userKey = "HKCU:\Environment"
  $machinePath = (Get-ItemProperty -Path $machineKey -Name Path -ErrorAction SilentlyContinue).Path
  $machineEntries = @($machinePath -split ";" | Where-Object { $_ })

  if ($machineEntries -contains $Directory) {
    return "Machine"
  }

  try {
    $updatedMachinePath = @($machineEntries + $Directory) -join ";"
    Set-ItemProperty -Path $machineKey -Name Path -Value $updatedMachinePath
    return "Machine"
  } catch {
    New-Item -Path $userKey -Force | Out-Null
    $userPath = (Get-ItemProperty -Path $userKey -Name Path -ErrorAction SilentlyContinue).Path
    $userEntries = @($userPath -split ";" | Where-Object { $_ })

    if ($userEntries -notcontains $Directory) {
      $updatedUserPath = @($userEntries + $Directory) -join ";"
      Set-ItemProperty -Path $userKey -Name Path -Value $updatedUserPath
    }

    return "User"
  }
}

Write-Step "Creating install directory at $BinDirectory"
New-Item -ItemType Directory -Path $BinDirectory -Force | Out-Null

Write-Step "Downloading latest Provision release"
Start-BitsTransfer -Source $DownloadUrl -Destination $ExecutablePath

Write-Step "Adding $BinDirectory to PATH"
$pathScope = Add-DirectoryToPath -Directory $BinDirectory

$sessionPath = @($env:Path -split ";" | Where-Object { $_ })

if ($sessionPath -notcontains $BinDirectory) {
  $env:Path = @($sessionPath + $BinDirectory) -join ";"
}

Write-Host ""
Write-Host "Provision installed to: $ExecutablePath"
Write-Host "PATH updated at $pathScope scope."
Write-Host "You can now run: provision"
