# Install dependencies and run `yarn dist` for the Windows desktop app.
# Extra args are forwarded to `yarn dist` (e.g. --publish=never).
#
# `yarn install` can fail randomly on CI when node-pre-gyp downloads prebuilt
# sqlite3 binaries from GitHub Releases, so we retry it a few times.
function Build-WindowsApp {
	param([string[]]$DistArgs = @())

	$attempts = 3
	for ($i = 1; $i -le $attempts; $i++) {
		yarn install
		if ($LASTEXITCODE -eq 0) { break }
		if ($i -eq $attempts) { exit $LASTEXITCODE }
		Write-Host "yarn install failed (attempt $i/$attempts) - retrying..."
		Start-Sleep -Seconds 10
	}

	cd packages/app-desktop
	yarn dist @DistArgs
	if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
