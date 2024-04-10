
const fs = require('fs');

function mkdirSyncRecursive(path) {
	if (!fs.existsSync(path)) {
		mkdirSyncRecursive(path.substring(0, path.lastIndexOf('/')));
		fs.mkdirSync(path);
	}
}

function isDirectory(path) {
	if (!fs.existsSync(path)) return false;
	return fs.lstatSync(path).isDirectory();
}

module.exports = {
	mkdirSyncRecursive,
	isDirectory,
};
