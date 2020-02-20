const execa = require('execa');

module.exports = async function() {
	if (process.platform !== 'darwin') return Promise.resolve();

	try {
		const promise = execa('pod', ['install'], { cwd: `${__dirname}/../ios` });
		promise.stdout.pipe(process.stdout);
		await promise;
	} catch (error) {
		console.warn('Could not run pod install', error);
	}

	return Promise.resolve();
};
