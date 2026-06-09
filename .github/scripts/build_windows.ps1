# Force the postinstall build to run sequentially and retry `yarn install` a
# few times. Parallel postinstall builds randomly crash on Windows with
# STATUS_STACK_BUFFER_OVERRUN (0xC0000409), and node-pre-gyp prebuilt sqlite3
# downloads from GitHub Releases occasionally fail. Setting the env vars here
# (rather than only on the workflow step) ensures they reach every child
# process spawned by `yarn install` -> postinstall -> gulp.
function Install-WindowsDeps {
	$env:BUILD_SEQUENCIAL = '1'
	$env:IS_CONTINUOUS_INTEGRATION = '1'

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
function Build-WindowsApp {
	param([string[]]$DistArgs = @())

	Install-WindowsDeps

	cd packages/app-desktop
	yarn dist @DistArgs
	if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
