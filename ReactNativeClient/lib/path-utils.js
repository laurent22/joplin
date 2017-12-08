function dirname(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}

function basename(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split(/\/|\\/);
	return s[s.length - 1];
}

function filename(path) {
	if (!path) throw new Error('Path is empty');
	let output = basename(path);
	if (output.indexOf('.') < 0) return output;

	output = output.split('.');
	output.pop();
	return output.join('.');
}

function fileExtension(path) {
	if (!path) throw new Error('Path is empty');

	let output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
}

function isHidden(path) {
	let b = basename(path);
	if (!b.length) throw new Error('Path empty or not a valid path: ' + path);
	return b[0] === '.';
}

function safeFileExtension(e) {
	if (!e || !e.replace) return '';
	return e.replace(/[^a-zA-Z0-9]/g, '')
}

function toSystemSlashes(path, os) {
	if (os === 'win32') return path.replace(/\//g, "\\");
	return path.replace(/\\/g, "/");
}

module.exports = { basename, dirname, filename, isHidden, fileExtension, safeFileExtension, toSystemSlashes };