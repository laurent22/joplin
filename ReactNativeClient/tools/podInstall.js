const execa = require('execa');

module.exports = async function() {
	if (process.platform !== 'darwin') return Promise.resolve();
	const promise = execa('pod', ['install'], { cwd: `${__dirname}/../ios` });
	promise.stdout.pipe(process.stdout);
	return promise;
};
