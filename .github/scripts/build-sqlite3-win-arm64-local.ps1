param(
	[ValidateSet('arm64', 'x64')]
	[string]$TargetArch = 'arm64',
	[string]$MsvsVersion = '2022',
	[switch]$SkipInstall
)

# Builds sqlite3 native bindings for desktop in a local/session-scoped ARM64 setup.
# Includes targeted runtime patching for current node-gyp/gyp edge cases.
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$corepackPath = $null
$desktopNodeModulesPath = Join-Path $repoRoot 'packages\app-desktop\node_modules'
$sqlite3Path = Join-Path $desktopNodeModulesPath 'sqlite3'
$nodeGypVsFile = Join-Path $desktopNodeModulesPath 'node-gyp\lib\find-visualstudio.js'

# Resolve a command path from PATH with a descriptive error when missing.
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
$nodeExePath = Resolve-CommandPath -Names @('node.exe', 'node') -Description 'node'

# Run Yarn through corepack and fail on non-zero exit.
function Invoke-CorepackYarn {
	param(
		[Parameter(Mandatory = $true)]
		[string[]]$Args
	)

	& $corepackPath yarn @Args
	if ($LASTEXITCODE -ne 0) {
		throw "yarn $($Args -join ' ') failed with exit code $LASTEXITCODE"
	}
}

# Patch node-gyp VS mapping so version 18 is accepted as 2022.
function Patch-NodeGypVs18Support {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath
	)

	if (-not (Test-Path $FilePath)) {
		throw "node-gyp VS detection file not found: $FilePath"
	}

	$content = Get-Content -Raw -Path $FilePath
	if ($content -match 'ret\.versionMajor === 18') {
		return
	}

	$pattern = "if \(ret\.versionMajor === 17\) \{\r?\n\s+ret\.versionYear = 2022\r?\n\s+return ret\r?\n\s+\}"
	$replacement = "$&`r`n    if (ret.versionMajor === 18) {`r`n      ret.versionYear = 2022`r`n      return ret`r`n    }"
	$updated = [Regex]::Replace($content, $pattern, $replacement)

	if ($updated -eq $content) {
		throw 'Could not patch node-gyp VS18 mapping (expected block not found).'
	}

	Set-Content -Path $FilePath -Value $updated
}

# Patch generated sqlite3 vcxproj custom action to use absolute node path.
function Patch-Sqlite3ActionProject {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Sqlite3Root,
		[Parameter(Mandatory = $true)]
		[string]$NodeExePath
	)

	$actionProjects = Get-ChildItem -Path (Join-Path $Sqlite3Root 'build-tmp-napi-v*\deps\action_before_build.vcxproj') -ErrorAction SilentlyContinue
	if (-not $actionProjects -or $actionProjects.Count -eq 0) {
		throw 'Could not find sqlite3 action_before_build.vcxproj to patch.'
	}

	$actionProject = $actionProjects | Sort-Object LastWriteTime -Descending | Select-Object -First 1
	$content = Get-Content -Raw -Path $actionProject.FullName
	$updated = $content
	# Generated vcxproj can emit `call node` patterns that fail to resolve in
	# some MSBuild contexts. Force absolute node path for custom action command.
	$xmlNodePath = $NodeExePath.Replace('\', '\\')
	$updated = $updated -replace 'call call &quot;node&quot;', "call &quot;$xmlNodePath&quot;"
	$updated = $updated -replace 'call &quot;node&quot;', "call &quot;$xmlNodePath&quot;"

	if ($updated -ne $content) {
		Set-Content -Path $actionProject.FullName -Value $updated
	}

	$actionProjectDir = Split-Path $actionProject.FullName -Parent
	$solutionPath = Join-Path (Split-Path $actionProjectDir -Parent) 'binding.sln'
	if (-not (Test-Path $solutionPath)) {
		throw "Could not find sqlite3 solution at $solutionPath"
	}

	return $solutionPath
}

# Locate MSBuild from the current developer shell environment.
function Find-MsBuild {
	$msbuildCommand = Get-Command MSBuild.exe -ErrorAction SilentlyContinue
	if ($msbuildCommand -and $msbuildCommand.Source) {
		return $msbuildCommand.Source
	}

	throw 'Could not find MSBuild executable for Visual Studio.'
}

. (Join-Path $PSScriptRoot 'dev-shell-win-arm64.ps1') -Arch $TargetArch -HostArch $TargetArch -MsvsVersion $MsvsVersion -SetLocationToRepo

if (-not $SkipInstall) {
	Write-Host 'Installing dependencies without build scripts ...'
	Invoke-CorepackYarn -Args @('install', '--mode=skip-build')
}

Patch-NodeGypVs18Support -FilePath $nodeGypVsFile

Set-Location $sqlite3Path

Remove-Item Env:CC -ErrorAction SilentlyContinue
Remove-Item Env:CXX -ErrorAction SilentlyContinue
Remove-Item Env:CC_aarch64_pc_windows_msvc -ErrorAction SilentlyContinue
Remove-Item Env:CXX_aarch64_pc_windows_msvc -ErrorAction SilentlyContinue

$env:GYP_MSVS_VERSION = $MsvsVersion
$env:npm_config_msvs_version = $MsvsVersion

Write-Host 'Running sqlite3 node-pre-gyp install --fallback-to-build ...'
node ..\@mapbox\node-pre-gyp\bin\node-pre-gyp install --fallback-to-build
$installExit = $LASTEXITCODE

if ($installExit -eq 0) {
	Write-Host 'sqlite3 build completed successfully without MSBuild patch.'
	Write-Host 'sqlite3 local ARM64 build completed.'
	return
}

Write-Host "node-pre-gyp install failed with exit code $installExit; applying sqlite3 MSBuild action patch and retrying ..."

$solutionPath = Patch-Sqlite3ActionProject -Sqlite3Root $sqlite3Path -NodeExePath $nodeExePath
$msbuildPath = Find-MsBuild

& $msbuildPath $solutionPath '/clp:Verbosity=minimal' '/nologo' '/nodeReuse:false' '/p:Configuration=Release;Platform=ARM64'
if ($LASTEXITCODE -ne 0) {
	throw "MSBuild failed with exit code $LASTEXITCODE"
}

$outputNode = Join-Path $sqlite3Path 'lib\binding\napi-v6-win32-unknown-arm64\node_sqlite3.node'
if (-not (Test-Path $outputNode)) {
	throw "sqlite3 output file not found: $outputNode"
}

Write-Host "sqlite3 output: $outputNode"
Write-Host 'sqlite3 local ARM64 build completed.'
