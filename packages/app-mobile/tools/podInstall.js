const execa = require('execa');

module.exports = async function() {
	if (process.platform !== 'darwin') return Promise.resolve();

	if (!process.env.RUN_POD_INSTALL) {
		// We almost never need to run `pod install` either because it has
		// already been done, or because we are not building the iOS app, yet
		// it's taking most of the build time (3 min out of the 5 min needed to
		// build the entire monorepo). If it needs to be ran, XCode will tell us
		// anyway.
		console.warn('**Not** running `pod install` - set `RUN_POD_INSTALL` to `1` to do so');
		return Promise.resolve();
	}

	try {
		const promise = execa('pod', ['install'], { cwd: `${__dirname}/../ios` });
		promise.stdout.pipe(process.stdout);
		await promise;
	} catch (error) {
		console.warn('Could not run pod install', error);
	}

	return Promise.resolve();
};
