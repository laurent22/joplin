const fs = require('fs-extra');

class FsDriverNode {

	appendFileSync(path, string) {
		return fs.appendFileSync(path, string);
	}

	writeBinaryFile(path, content) {
		let buffer = new Buffer(content);
		return fs.writeFile(path, buffer);
	}

	readFile(path) {
		return fs.readFile(path);
	}

}

module.exports.FsDriverNode = FsDriverNode;