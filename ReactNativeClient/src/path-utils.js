function basename(path) {
	if (!path) throw new Error('Path is empty');
	let s = path.split('/');
	return s[s.length - 1];
}

function isHidden(path) {
	let b = basename(path);
	if (!b.length) throw new Error('Path empty or not a valid path: ' + path);
	return b[0] === '.';
}

export { basename, isHidden };