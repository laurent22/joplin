
const fs = require('node:fs');
const path = require('node:path');

function mkdirSyncRecursive(filepath) {
	if (!fs.existsSync(filepath)) {
		mkdirSyncRecursive(filepath.substring(0, filepath.lastIndexOf(path.sep)));
		fs.mkdirSync(filepath);
	}
}

function isDirectory(filepath) {
	if (!fs.existsSync(filepath)) return false;
	return fs.lstatSync(filepath).isDirectory();
}

function readDir(filepath) {
	const dirContents = fs.readdirSync(filepath, { withFileTypes: true });
	return dirContents.map(entry => filepath + path.sep + entry.name).join('\n');
}

function removePrefix(basePath, prefix) {
	return basePath.replace(prefix, '');
}

function normalizeAndWriteFile(filePath, data) {
	filePath = path.normalize(filePath);
	fs.writeFileSync(filePath, data);
}

function fileReader(path) {
	const fd = fs.openSync(path);
	// TODO: When Node v20 is EOL, replace this with the { bigint: true }
	// parameter variant.
	const size = BigInt(fs.fstatSync(fd).size);

	return {
		read: (bigPosition, bigLength) => {
			// Rust uses u64 for position/length which is transferred to JS as a BigInt.
			// Convert:
			const length = Number(bigLength);
			const position = Number(bigPosition);

			const data = Buffer.alloc(length);
			const sizeRead = fs.readSync(fd, data, { length, position });

			// Make data.size match the number of bytes read:
			return data.subarray(0, sizeRead);
		},
		size: () => {
			return size;
		},
		close: () => {
			fs.closeSync(fd);
		},
	};
}

function isWindows() {
	return process.platform === 'win32';
}

module.exports = {
	mkdirSyncRecursive,
	isDirectory,
	readDir,
	removePrefix,
	normalizeAndWriteFile,
	fileReader,
	isWindows,
};
