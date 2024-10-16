
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

function getOutputPath(inputDir, outputDir, filePath) {
	const basePathFromInputFolder = filePath.replace(inputDir, '');
	const newOutput = path.join(outputDir, basePathFromInputFolder);
	return path.dirname(newOutput);
}

function getParentDir(filePath) {
	return path.basename(path.dirname(filePath));
}

function normalizeAndWriteFile(filePath, data) {
	filePath = path.normalize(filePath);
	fs.writeFileSync(filePath, data);
}

module.exports = {
	mkdirSyncRecursive,
	isDirectory,
	readDir,
	removePrefix,
	getOutputPath,
	getParentDir,
	normalizeAndWriteFile,
};
