// We don't make that a gulp task because we might want to run it before gulp has been installed.
// For now this script is specifically for Android, as it's the build that causes the most problems.
// We also don't want to clear the iOS data whenever we build the Android app.

const fs = require('fs');

function deleteMatchingDirs(rootDir, predicate) {
	let entries;
	try {
		entries = fs.readdirSync(rootDir, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const fullPath = `${rootDir}/${entry.name}`;

		if (predicate(fullPath)) {
			fs.rmSync(fullPath, { recursive: true, force: true });
		} else {
			deleteMatchingDirs(fullPath, predicate);
		}
	}
}

function main() {
	const mobileDir = `${__dirname}/..`;

	// Standard Android build artefacts
	fs.rmSync(`${mobileDir}/android/.gradle`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/build`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/app/build`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/.cxx`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/app/.cxx`, { recursive: true, force: true });

	// React Native generated files that frequently break CMake/autolinking
	fs.rmSync(`${mobileDir}/android/app/build/generated/autolinking`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/app/build/generated/source/codegen`, { recursive: true, force: true });

	// iOS
	// fs.rmSync(`${mobileDir}/ios/Pods`, { recursive: true, force: true });

	// Delete all native module Android build artefacts
	// Equivalent to:
	// find . -path "*/node_modules/*/android/build" -type d -exec rm -rf {} + || true
	// find . -path "*/node_modules/*/android/.cxx" -type d -exec rm -rf {} + || true
	deleteMatchingDirs(mobileDir, p =>
		p.includes('/node_modules/') && (
			p.endsWith('/android/build') ||
			p.endsWith('/android/.cxx')
		),
	);

	console.info(
		'Mobile app build artefacts cleaned.\n' +
		'If you still see build issues, you may also need to clear ~/.gradle/caches and ~/.android.',
	);
}

try {
	main();
} catch (error) {
	console.error('Could not clean mobile app build', error);
	process.exit(1);
}
