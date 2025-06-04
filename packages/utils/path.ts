/* eslint no-useless-escape: 0*/

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

export function filename(path: string, includeDir = false) {
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

export function isHidden(path: string) {
	const b = basename(path);
	if (!b.length) throw new Error(`Path empty or not a valid path: ${path}`);
	return b[0] === '.';
}

// Note that this function only sanitizes a file extension - it does NOT extract
// the file extension from a filename. So the way you'd normally call this is
// `safeFileExtension(fileExtension(filename))`
export function safeFileExtension(e: string, maxLength: number|null = null) {
	// In theory the file extension can have any length but in practice Joplin
	// expects a fixed length, so we limit it to 20 which should cover most cases.
	// Note that it means that a file extension longer than 20 will break
	// external editing (since the extension would be truncated).
	// https://discourse.joplinapp.org/t/troubles-with-webarchive-files-on-ios/10447
	if (maxLength === null) maxLength = 20;
	if (!e || !e.replace) return '';
	return e.replace(/[^a-zA-Z0-9]/g, '').substring(0, maxLength);
}

export function safeFilename(e: string, maxLength: number|null = null, allowSpaces = false) {
	if (maxLength === null) maxLength = 32;
	if (!e || !e.replace) return '';
	const regex = allowSpaces ? /[^a-zA-Z0-9\-_\(\)\. ]/g : /[^a-zA-Z0-9\-_\(\)\.]/g;
	const output = e.replace(regex, '_');
	return output.substring(0, maxLength);
}

export function toFileProtocolPath(filePathEncode: string, os: string|null = null) {
	if (os === null) os = process.platform;

	if (os === 'win32') {
		filePathEncode = filePathEncode.replace(/\\/g, '/'); // replace backslash in windows pathname with slash e.g. c:\temp to c:/temp
		filePathEncode = `/${filePathEncode}`; // put slash in front of path to comply with windows fileURL syntax
	}

	filePathEncode = encodeURI(filePathEncode);
	filePathEncode = filePathEncode.replace(/\+/g, '%2B'); // escape '+' with unicode
	return `file://${filePathEncode.replace(/\'/g, '%27')}`; // escape '(single quote) with unicode, to prevent crashing the html view
}

export function toSystemSlashes(path: string, os: string|null = null) {
	if (os === null) os = process.platform;
	if (os === 'win32') return path.replace(/\//g, '\\');
	return path.replace(/\\/g, '/');
}

export function toForwardSlashes(path: string) {
	return toSystemSlashes(path, 'linux');
}

export function rtrimSlashes(path: string) {
	return path.replace(/[\/\\]+$/, '');
}

export function ltrimSlashes(path: string) {
	return path.replace(/^\/+/, '');
}

export function trimSlashes(path: string): string {
	return ltrimSlashes(rtrimSlashes(path));
}

// UNC paths can point to network drives and thus can be dangerous to open
// on some Windows devices.
// See https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-dtyp/62e862f4-2a51-452e-8eeb-dc4ff5ee33cc
export const isUncPath = (path: string, os: string|null = null) => {
	return toSystemSlashes(path.trim(), os).startsWith('\\\\');
};

export function quotePath(path: string) {
	if (!path) return '';
	if (path.indexOf('"') < 0 && path.indexOf(' ') < 0) return path;
	path = path.replace(/"/, '\\"');
	return `"${path}"`;
}

export function unquotePath(path: string) {
	if (!path.length) return '';
	if (path.length && path[0] === '"') {
		path = path.substring(1, path.length - 1);
	}
	path = path.replace(/\\"/, '"');
	return path;
}

export function extractExecutablePath(cmd: string) {
	if (!cmd.length) return '';

	const quoteType = ['"', '\''].indexOf(cmd[0]) >= 0 ? cmd[0] : '';

	let output = '';
	for (let i = 0; i < cmd.length; i++) {
		const c = cmd[i];
		if (quoteType) {
			if (i > 0 && c === quoteType) {
				output += c;
				break;
			}
		} else {
			if (c === ' ') break;
		}

		output += c;
	}

	return output;
}
