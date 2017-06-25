function dirname(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split('/');
	s.pop();
	return s.join('/');
}

function basename(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split('/');
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

function isHidden(path) {
	let b = basename(path);
	if (!b.length) throw new Error('Path empty or not a valid path: ' + path);
	return b[0] === '.';
}

export { basename, dirname, filename, isHidden };