export function dirname(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}

export function basename(path: string) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
}

export function filename(path: string, includeDir = false): string {
	if (!path) throw new Error('Path is empty');
	const output = includeDir ? path : basename(path);
	if (output.indexOf('.') < 0) return output;

	const splitted = output.split('.');
	splitted.pop();
	return splitted.join('.');
}

export function fileExtension(path: string) {
	if (!path) throw new Error('Path is empty');

	const output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
}

export function toForwardSlashes(path: string) {
	return path.replace(/\\/g, '/');
}
