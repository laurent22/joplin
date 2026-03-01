param(
	[ValidateSet('arm64', 'x64')]
	[string]$Arch = 'arm64',
	[ValidateSet('arm64', 'x64')]
	[string]$HostArch = 'arm64',
	[string]$MsvsVersion = '2022',
	[switch]$Quiet,
	[switch]$SetLocationToRepo
)

# Configures a Visual Studio developer shell for this terminal session only.
# Intended for local ARM64 build workflows without global environment changes.
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$vsDevShellCandidates = @(
	' C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\Launch-VsDevShell.ps1'.Trim(),
	' C:\Program Files\Microsoft Visual Studio\18\Community\Common7\Tools\Launch-VsDevShell.ps1'.Trim()
)

$vsDevShell = $vsDevShellCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $vsDevShell) {
	throw 'Could not find Launch-VsDevShell.ps1. Install VS 2022 Build Tools or Visual Studio with C++ workload.'
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodeBinDir = if ($nodeCommand -and $nodeCommand.Source) { Split-Path -Parent $nodeCommand.Source } else { $null }

if ($Quiet) {
	& $vsDevShell -Arch $Arch -HostArch $HostArch 1>$null 2>$null 3>$null 4>$null 5>$null 6>$null
} else {
	& $vsDevShell -Arch $Arch -HostArch $HostArch
}

$pathEntries = @(
	"$env:USERPROFILE\.cargo\bin",
	$nodeBinDir
)

foreach ($entry in $pathEntries) {
	if ((Test-Path $entry) -and -not (($env:Path -split ';') -contains $entry)) {
		$env:Path = "$entry;$env:Path"
	}
}

$env:GYP_MSVS_VERSION = $MsvsVersion
$env:npm_config_msvs_version = $MsvsVersion

if ($SetLocationToRepo) {
	Set-Location $repoRoot
}

if (-not $Quiet) {
	Write-Host "Repo root: $repoRoot"
	Write-Host "Using VS DevShell: $vsDevShell"
	Write-Host "Arch=$Arch HostArch=$HostArch msvs_version=$MsvsVersion"
	Write-Host 'Session configured. No global machine settings were modified.'
}
