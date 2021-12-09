// We don't make that a gulp task because we might want to run it before
// gulp has been installed.

const fs = require('fs');

function main() {
	const mobileDir = `${__dirname}/..`;
	fs.rmSync(`${mobileDir}/android/.gradle`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/android/app/build`, { recursive: true, force: true });
	fs.rmSync(`${mobileDir}/ios/Pods`, { recursive: true, force: true });
	console.info('To clean the Android build, in some rare cases you might also need to clear the cache in ~/.android and ~/.gradle');
}

try {
	main();
} catch (error) {
	console.error('Could not clean mobile app build', error);
	process.exit(1);
}
