param(
	[ValidateSet('arm64', 'x64')]
	[string]$TargetArch = 'arm64',
	[string]$MsvsVersion = '2022',
	[switch]$Clean,
	[switch]$Publish,
	[switch]$ForceSourceBuild,
	[switch]$SkipBuildScriptsInstall,
	[switch]$SkipInstall,
	[switch]$SkipDist
)

# Local Windows ARM64 build entrypoint.
# Scope: current shell session only (no global machine mutation).
# This script intentionally applies temporary node-gyp/native-module workarounds
# for current upstream Windows ARM64 gaps in third-party dependencies.
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$desktopPath = Join-Path $repoRoot 'packages\app-desktop'

# Resolve a command from PATH and fail with a clear message if missing.
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

# Run Yarn through corepack and stop on non-zero exit.
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

# Update package.json build keys using npm pkg set.
function Invoke-NpmPkgSet {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Assignment
	)

	& $npmPath pkg set $Assignment
	if ($LASTEXITCODE -ne 0) {
		throw "npm pkg set $Assignment failed with exit code $LASTEXITCODE"
	}
}

# Patch node-gyp to recognize VS major version 18 as 2022.
function Patch-NodeGypVs18Support {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath
	)

	if (-not (Test-Path $FilePath)) {
		return
	}

	$content = Get-Content -Raw -Path $FilePath
	if ($content -match 'ret\.versionMajor === 18') {
		return
	}

	# node-gyp currently maps VS major versions explicitly; add v18 -> 2022 mapping
	# so local Visual Studio 18 dev shells are accepted.
	$pattern = "if \(ret\.versionMajor === 17\) \{\r?\n\s+ret\.versionYear = 2022\r?\n\s+return ret\r?\n\s+\}"
	$replacement = "$&`r`n    if (ret.versionMajor === 18) {`r`n      ret.versionYear = 2022`r`n      return ret`r`n    }"
	$updated = [Regex]::Replace($content, $pattern, $replacement)

	if ($updated -ne $content) {
		Set-Content -Path $FilePath -Value $updated
	}
}

# Select Python executable for node-gyp from common launchers.
function Set-PythonForBuild {
	$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
	if ($pythonCommand -and $pythonCommand.Source) {
		$env:PYTHON = $pythonCommand.Source
		$env:npm_config_python = $pythonCommand.Source
		return
	}

	$pyLauncher = Get-Command py -ErrorAction SilentlyContinue
	if ($pyLauncher -and $pyLauncher.Source) {
		$env:PYTHON = $pyLauncher.Source
		$env:npm_config_python = $pyLauncher.Source
	}
}

# Replace sqlite3 node-addon-api shell calls with direct local paths.
function Patch-Sqlite3BindingGypNodeAddonApi {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath
	)

	if (-not (Test-Path $FilePath)) {
		return
	}

	$content = Get-Content -Raw -Path $FilePath
	$updated = $content

	# Avoid `node -p` calls inside gyp evaluation. These can fail under nested
	# electron-rebuild invocation on some Windows ARM64 setups.
	$updated = $updated.Replace('"<!@(node -p \"require(''node-addon-api'').include\")"', '"<(module_root_dir)/../node-addon-api"')
	$updated = $updated.Replace('"<!(node -p \"require(''node-addon-api'').gyp\")"', '"<(module_root_dir)/../node-addon-api/node_api.gyp:nothing"')

	if ($updated -ne $content) {
		Set-Content -Path $FilePath -Value $updated
	}
}

# Force sqlite3 gyp action commands to use an absolute node path.
function Patch-Sqlite3DepsGypNodeExecutable {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath,
		[Parameter(Mandatory = $true)]
		[string]$NodeExePath
	)

	if (-not (Test-Path $FilePath)) {
		return
	}

	$content = Get-Content -Raw -Path $FilePath
	$updated = $content
	# Force an absolute node path for gyp-generated custom actions to avoid PATH
	# lookup issues inside spawned MSBuild command environments.
	$nodePathForGyp = $NodeExePath.Replace('\\', '/')
	$updated = $updated.Replace("'action': ['node',", "'action': ['$nodePathForGyp',")
	$updated = $updated.Replace("'action': ['node.exe',", "'action': ['$nodePathForGyp',")

	if ($updated -ne $content) {
		Set-Content -Path $FilePath -Value $updated
	}
}

# Replace keytar node-addon-api shell include lookup with a local path.
function Patch-KeytarBindingGypNodeAddonApi {
	param(
		[Parameter(Mandatory = $true)]
		[string]$FilePath
	)

	if (-not (Test-Path $FilePath)) {
		return
	}

	$content = Get-Content -Raw -Path $FilePath
	# Same rationale as sqlite3: resolve include path without shelling out to node.
	$updated = $content.Replace('"<!(node -p \"require(''node-addon-api'').include_dir\")"', '"<(module_root_dir)/../node-addon-api"')

	if ($updated -ne $content) {
		Set-Content -Path $FilePath -Value $updated
	}
}

# Ensure node executables exist in repo-local bin and are first on PATH.
function Ensure-NodeExecutableOnPath {
	param(
		[Parameter(Mandatory = $true)]
		[string]$NodeExePath
	)

	# Provide both node.exe and extensionless node in a repo-local bin dir. Some
	# gyp/MSBuild custom actions invoke one or the other depending on quoting.
	$localBinPath = Join-Path $repoRoot '.local\bin'
	$localNodeExe = Join-Path $localBinPath 'node.exe'
	$localNodeNoExt = Join-Path $localBinPath 'node'

	if (-not (Test-Path $localBinPath)) {
		New-Item -Path $localBinPath -ItemType Directory -Force | Out-Null
	}

	if (-not (Test-Path $localNodeExe)) {
		if (-not (Test-Path $NodeExePath)) {
			throw "node executable not found at $NodeExePath"
		}

		Copy-Item -Path $NodeExePath -Destination $localNodeExe -Force
	}

	if (-not (Test-Path $localNodeNoExt)) {
		Copy-Item -Path $localNodeExe -Destination $localNodeNoExt -Force
	}

	if ($env:Path -notlike "$localBinPath;*") {
		$env:Path = "$localBinPath;$($env:Path)"
	}
}

. (Join-Path $PSScriptRoot 'dev-shell-win-arm64.ps1') -Arch $TargetArch -HostArch $TargetArch -MsvsVersion $MsvsVersion -SetLocationToRepo

$corepackPath = Resolve-CommandPath -Names @('corepack.cmd', 'corepack') -Description 'corepack'
$npmPath = Resolve-CommandPath -Names @('npm.cmd', 'npm') -Description 'npm'

$nodeExePath = Resolve-CommandPath -Names @('node.exe', 'node') -Description 'node'
Ensure-NodeExecutableOnPath -NodeExePath $nodeExePath

# Keep python explicit for node-gyp to reduce interpreter ambiguity on Windows.
Set-PythonForBuild

Patch-NodeGypVs18Support -FilePath (Join-Path $repoRoot 'packages\app-desktop\node_modules\node-gyp\lib\find-visualstudio.js')
Patch-NodeGypVs18Support -FilePath (Join-Path $repoRoot 'packages\app-desktop\node_modules\@electron\node-gyp\lib\find-visualstudio.js')
Patch-NodeGypVs18Support -FilePath (Join-Path $repoRoot 'packages\lib\node_modules\node-gyp\lib\find-visualstudio.js')
Patch-NodeGypVs18Support -FilePath (Join-Path $repoRoot 'packages\lib\node_modules\@electron\node-gyp\lib\find-visualstudio.js')

$sqliteBindingFiles = Get-ChildItem -Path (Join-Path $repoRoot 'packages') -Filter 'binding.gyp' -File -Recurse -ErrorAction SilentlyContinue |
	Where-Object { $_.FullName -match '\\node_modules\\sqlite3\\binding\.gyp$' }
foreach ($file in $sqliteBindingFiles) {
	Patch-Sqlite3BindingGypNodeAddonApi -FilePath $file.FullName
}

$sqliteDepsGypFiles = Get-ChildItem -Path (Join-Path $repoRoot 'packages') -Filter 'sqlite3.gyp' -File -Recurse -ErrorAction SilentlyContinue |
	Where-Object { $_.FullName -match '\\node_modules\\sqlite3\\deps\\sqlite3\.gyp$' }
foreach ($file in $sqliteDepsGypFiles) {
	Patch-Sqlite3DepsGypNodeExecutable -FilePath $file.FullName -NodeExePath $nodeExePath
}

$keytarBindingFiles = Get-ChildItem -Path (Join-Path $repoRoot 'packages') -Filter 'binding.gyp' -File -Recurse -ErrorAction SilentlyContinue |
	Where-Object { $_.FullName -match '\\node_modules\\keytar\\binding\.gyp$' }
foreach ($file in $keytarBindingFiles) {
	Patch-KeytarBindingGypNodeAddonApi -FilePath $file.FullName
}

if ($Clean) {
	Write-Host 'Running git clean -xfd ...'
	git clean -xfd
}

if (-not $SkipInstall) {
	# onenote-converter builds are handled by dedicated helper script to keep
	# install fast and resilient in ARM64 local setups.
	$env:SKIP_ONENOTE_CONVERTER_BUILD = '1'

	if ($ForceSourceBuild) {
		$env:npm_config_build_from_source = 'true'
		$env:npm_config_fallback_to_build = 'true'
	} else {
		Remove-Item Env:npm_config_build_from_source -ErrorAction SilentlyContinue
		Remove-Item Env:npm_config_fallback_to_build -ErrorAction SilentlyContinue
	}

	Write-Host 'Running yarn install ...'
	$installArgs = @('install')
	if ($SkipBuildScriptsInstall) {
		$installArgs += '--mode=skip-build'
	}

	Invoke-CorepackYarn -Args $installArgs
}

if (-not $SkipDist) {
	Set-Location $desktopPath

	$env:npm_config_arch = $TargetArch
	$env:npm_config_target_arch = $TargetArch

	Invoke-NpmPkgSet -Assignment 'build.win.artifactName=${productName}-${version}-${arch}.${ext}'
	Invoke-NpmPkgSet -Assignment 'build.portable.artifactName=${productName}Portable-${version}-${arch}.${ext}'

	if ($TargetArch -eq 'arm64') {
		Invoke-NpmPkgSet -Assignment 'build.win.target[0].target=nsis'
		Invoke-NpmPkgSet -Assignment 'build.win.target[0].arch[0]=arm64'
		Invoke-NpmPkgSet -Assignment 'build.win.target[1].target=portable'
		Invoke-NpmPkgSet -Assignment 'build.win.target[1].arch[0]=arm64'
	}

	$distArgs = @('dist', '--win', "--$TargetArch")
	if (-not $Publish) {
		$distArgs += '--publish=never'
	}

	Write-Host "Running yarn $($distArgs -join ' ') ..."
	Invoke-CorepackYarn -Args $distArgs
}

Write-Host 'Build script completed.'
