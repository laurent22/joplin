param(
	[ValidateSet('arm64', 'x64')]
	[string]$TargetArch = 'arm64',
	[string]$MsvsVersion = '2022',
	[switch]$JsonOutput,
	[switch]$SkipInstall
)

# Installs dependencies in a session-only ARM64 dev shell and reports
# dependency chains for known native blockers.
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Resolve a command from PATH and fail with a descriptive message.
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

# Run Yarn through corepack with optional output suppression.
function Invoke-CorepackYarn {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Args,
		[switch]$Quiet
	)

	if ($Quiet) {
		& $corepackPath yarn @Args 1>$null 2>$null 3>$null 4>$null 5>$null 6>$null
	} else {
		& $corepackPath yarn @Args
	}

	if ($LASTEXITCODE -ne 0) {
		throw "yarn $($Args -join ' ') failed with exit code $LASTEXITCODE"
	}
}

# Run Yarn through corepack and return command output lines.
function Get-CorepackYarnOutput {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Args
	)

	$rawOutput = & $corepackPath yarn @Args
	if ($LASTEXITCODE -ne 0) {
		throw "yarn $($Args -join ' ') failed with exit code $LASTEXITCODE"
	}

	if ($null -eq $rawOutput) {
		return @()
	}

	return @($rawOutput)
}

# Parse Yarn why --json output into structured entries.
function Get-YarnWhyEntries {
	param(
		[Parameter(Mandatory = $true)]
		[string]$PackageName
	)

	$lines = Get-CorepackYarnOutput -Args @('why', $PackageName, '--json')
	$entries = @()

	foreach ($line in $lines) {
		$lineString = "$line".Trim()
		if (-not $lineString.StartsWith('{')) {
			continue
		}

		try {
			$entry = $lineString | ConvertFrom-Json
			$entries += $entry
		} catch {
			# Ignore lines that are not valid JSON objects.
		}
	}

	return $entries
}

. (Join-Path $PSScriptRoot 'dev-shell-win-arm64.ps1') -Arch $TargetArch -HostArch $TargetArch -MsvsVersion $MsvsVersion -Quiet:$JsonOutput -SetLocationToRepo

$env:SKIP_ONENOTE_CONVERTER_BUILD = '1'
$env:npm_config_arch = $TargetArch
$env:npm_config_target_arch = $TargetArch
Remove-Item Env:npm_config_build_from_source -ErrorAction SilentlyContinue
Remove-Item Env:npm_config_fallback_to_build -ErrorAction SilentlyContinue

if (-not $SkipInstall) {
	if (-not $JsonOutput) {
		Write-Host 'Running dependency install without build scripts...'
	}
	# skip-build mode is intentional to gather dependency state without triggering
	# native postinstall failures during diagnostics.
	Invoke-CorepackYarn -Args @('install', '--mode=skip-build') -Quiet:$JsonOutput
}

if ($JsonOutput) {
	$sqlite3Entries = Get-YarnWhyEntries -PackageName 'sqlite3'
	$wasmPackEntries = Get-YarnWhyEntries -PackageName 'wasm-pack'

	$result = [ordered]@{
		timestamp = (Get-Date).ToUniversalTime().ToString('o')
		targetArch = $TargetArch
		msvsVersion = $MsvsVersion
		skipInstall = [bool]$SkipInstall
		dependencies = [ordered]@{
			sqlite3 = $sqlite3Entries
			'wasm-pack' = $wasmPackEntries
		}
	}

	$result | ConvertTo-Json -Depth 12
	return
}

Write-Host ''
Write-Host 'Dependency audit: sqlite3'
Invoke-CorepackYarn -Args @('why', 'sqlite3')

Write-Host ''
Write-Host 'Dependency audit: wasm-pack'
Invoke-CorepackYarn -Args @('why', 'wasm-pack')

Write-Host ''
Write-Host 'Audit completed.'
