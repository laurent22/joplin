
const fs = require('fs');

function mkdirSyncRecursive(path) {
	if (!fs.existsSync(path)) {
		// TOOD: fix this for windows
		mkdirSyncRecursive(path.substring(0, path.lastIndexOf('/')));
		fs.mkdirSync(path);
	}
}

function isDirectory(path) {
	if (!fs.existsSync(path)) return false;
	return fs.lstatSync(path).isDirectory();
}

function readDir(path) {
	const dirContents = fs.readdirSync(path, { withFileTypes: true });
	return dirContents.map(entry => entry.name).join('\n');
}

module.exports = {
	mkdirSyncRecursive,
	isDirectory,
	readDir,
};
