// We don't make that a gulp task because we might want to run it before
// gulp has been installed.

const fs = require('fs-extra');

async function main() {
	const mobileDir = `${__dirname}/..`;
	await fs.remove(`${mobileDir}/android/.gradle`);
	await fs.remove(`${mobileDir}/android/app/build`);
	await fs.remove(`${mobileDir}/ios/Pods`);
	console.info('To clean the Android build, in some rare cases you might also need to clear the cache in ~/.android and ~/.gradle');
}

main().catch((error) => {
	console.error('Could not clean mobile app build', error);
	process.exit(1);
});
