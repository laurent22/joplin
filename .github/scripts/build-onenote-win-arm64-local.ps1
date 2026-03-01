param(
	[ValidateSet('arm64', 'x64')]
	[string]$TargetArch = 'arm64',
	[string]$MsvsVersion = '2022',
	[string]$CargoInstallRoot,
	[switch]$ForceWasmPackInstall,
	[switch]$SkipInstall,
	[switch]$Release
)

# Builds onenote-converter in a local/session-scoped Windows ARM64 setup.
# No global PATH/toolchain changes are required.
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Resolve a command from PATH and fail clearly when unavailable.
function Resolve-CommandPath {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Names,
		[Parameter(Mandatory = $true)]
		[string]$Description
	)

	foreach ($name in $Names) {
		$command = Get-Command $name -ErrorAction SilentlyContinue
		if ($command -and $command.Source) {
			return $command.Source
		}
	}

	throw "$Description not found in PATH. Tried: $($Names -join ', ')"
}

$corepackPath = Resolve-CommandPath -Names @('corepack.cmd', 'corepack') -Description 'corepack'

if (-not $CargoInstallRoot) {
	# Keep Rust-installed helpers under repo-local path for reproducibility.
	$CargoInstallRoot = Join-Path $repoRoot '.local\cargo-tools'
}

# Execute a command and throw on non-zero exit code.
function Invoke-Checked {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath,
		[Parameter(Mandatory = $false)]
		[string[]]$Args = @()
	)

	& $FilePath @Args
	if ($LASTEXITCODE -ne 0) {
		throw "$FilePath $($Args -join ' ') failed with exit code $LASTEXITCODE"
	}
}

# Run Yarn through corepack with checked command execution.
function Invoke-CorepackYarn {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Args
	)

	$allArgs = @('yarn') + $Args
	Invoke-Checked -FilePath $corepackPath -Args $allArgs
}

. (Join-Path $PSScriptRoot 'dev-shell-win-arm64.ps1') -Arch $TargetArch -HostArch $TargetArch -MsvsVersion $MsvsVersion -SetLocationToRepo

$cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $cargoCommand) {
	throw 'cargo was not found in PATH for this session. Install Rust (rustup) first, then rerun this script.'
}

New-Item -ItemType Directory -Force -Path $CargoInstallRoot | Out-Null

$localCargoBin = Join-Path $CargoInstallRoot 'bin'
$localWasmPackPath = Join-Path $localCargoBin 'wasm-pack.exe'

if ($ForceWasmPackInstall -or -not (Test-Path $localWasmPackPath)) {
	Write-Host "Installing repo-local wasm-pack to $CargoInstallRoot ..."
	Invoke-Checked -FilePath $cargoCommand.Source -Args @('install', 'wasm-pack', '--locked', '--root', $CargoInstallRoot)
}

if (-not (Test-Path $localWasmPackPath)) {
	throw "wasm-pack was not found at $localWasmPackPath after installation"
}

if (-not (($env:Path -split ';') -contains $localCargoBin)) {
	$env:Path = "$localCargoBin;$env:Path"
}

$env:WASM_PACK_BIN = $localWasmPackPath.Replace('\\', '/')

# build.js supports WASM_PACK_BIN so we can bypass global wasm-pack resolution.

Write-Host "Using wasm-pack: $localWasmPackPath"

$env:npm_config_arch = $TargetArch
$env:npm_config_target_arch = $TargetArch

if (-not $SkipInstall) {
	Write-Host 'Installing dependencies without build scripts ...'
	Invoke-CorepackYarn -Args @('install', '--mode=skip-build')
}

Set-Location (Join-Path $repoRoot 'packages\onenote-converter')

if ($Release) {
	$env:IS_CONTINUOUS_INTEGRATION = '1'
	Write-Host 'Building onenote-converter release profile ...'
	Invoke-CorepackYarn -Args @('build')
} else {
	Write-Host 'Building onenote-converter dev profile ...'
	Invoke-CorepackYarn -Args @('buildDev')
}

Write-Host 'OneNote converter local build completed.'
