function isNode() {
	if (typeof process === 'undefined') return false;
	if (!process.release) return false;
	return process.release.name === 'node';
}

export { isNode };