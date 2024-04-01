
const fs = require('fs');

function mkdirSyncRecursive(path) {
	if (!fs.existsSync(path)) {
		mkdirSyncRecursive(path.substring(0, path.lastIndexOf('/')));
		fs.mkdirSync(path);
	}
}

module.exports = {
	mkdirSyncRecursive,
};
