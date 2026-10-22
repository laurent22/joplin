# Force the postinstall build to run sequentially and retry `yarn install` a
# few times. Parallel postinstall builds randomly crash on Windows with
# STATUS_STACK_BUFFER_OVERRUN (0xC0000409), and node-pre-gyp prebuilt sqlite3
# downloads from GitHub Releases occasionally fail. Setting the env vars here
# (rather than only on the workflow step) ensures they reach every child
# process spawned by `yarn install` -> postinstall -> gulp.
function Install-WindowsDeps {
	$env:BUILD_SEQUENCIAL = '1'
	$env:IS_CONTINUOUS_INTEGRATION = '1'

	if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
		# Deliberately not setting npm_config_build_from_source to force the
		# sqlite3 source build: sharp treats that variable as a boolean and
		# would then also build libvips from source, which fails. sqlite3
		# installs with --fallback-to-build, so it compiles by itself when the
		# win32-arm64 prebuilt is missing.

		# Deliberately not installing the VSSetup PowerShell module here: with it
		# present, node-gyp probes Visual Studio via `Get-VSSetupInstance |
		# ConvertTo-Json`, whose output exceeds the default 1MB child process
		# buffer on the VS 2026 image. That fails with
		# ERR_CHILD_PROCESS_STDIO_MAXBUFFER and node-gyp then reports the
		# install as version "undefined". Without the module it falls through to
		# its own Find-VisualStudio.cs helper, which prints far less.
	}

	$attempts = 3
	for ($i = 1; $i -le $attempts; $i++) {
		yarn install
		if ($LASTEXITCODE -eq 0) { return }
		if ($i -eq $attempts) { exit $LASTEXITCODE }
		Write-Host "yarn install failed (attempt $i/$attempts) - retrying..."
		Start-Sleep -Seconds 10
	}
}

# Install dependencies and run `yarn dist` for the Windows desktop app.
# Extra args are forwarded to `yarn dist` (e.g. --publish=never).
#
# Each runner builds only its own arch: cross compiling arm64 from x64 silently
# ships x64 .node files, as @electron/rebuild doesn't resolve native modules
# hoisted to the workspace root.
# https://github.com/electron-userland/electron-builder/issues/10187
function Build-WindowsApp {
	param([string[]]$DistArgs = @())

	Install-WindowsDeps

	# Targets are given as `target:arch` because `--arm64`/`--x64` don't override
	# the per-target `arch` lists in package.json - the build would include every
	# arch, all using this runner's native modules.
	if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
		# The installer and portable names have no arch suffix, and the update
		# metadata is `latest.yml` for every Windows arch. All of them would
		# clobber the x64 runner's artifacts.
		# https://github.com/electron-userland/electron-builder/issues/6372
		$archArgs = @(
			'--win', 'nsis:arm64', 'portable:arm64'
			'-c.nsis.artifactName=${productName}-Setup-${version}-arm64.${ext}'
			'-c.portable.artifactName=${productName}Portable-arm64.${ext}'
			'-c.publish.provider=github'
			'-c.publish.channel=latest-win-arm64'
		)
	} else {
		$archArgs = @('--win', 'nsis:x64', 'nsis:ia32', 'portable:x64', 'portable:ia32')
	}

	cd packages/app-desktop
	yarn dist @archArgs @DistArgs
	if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
