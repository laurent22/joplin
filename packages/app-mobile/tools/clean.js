const fs = require('fs-extra');

module.exports = async function() {
	const mobileDir = __dirname + '/..';
	await fs.remove(mobileDir + '/android/.gradle');
	await fs.remove(mobileDir + '/android/app/build');
	console.info('To clean the Android build, in some rare cases you might also need to clear the cache in ~/.android and ~/.gradle');
};
