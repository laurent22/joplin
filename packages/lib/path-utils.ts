/* eslint no-useless-escape: 0*/

const { _ } = require('./locale');

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

export function filename(path: string, includeDir: boolean = false) {
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

export function safeFileExtension(e: string, maxLength: number = null) {
	// In theory the file extension can have any length but in practice Joplin
	// expects a fixed length, so we limit it to 20 which should cover most cases.
	// Note that it means that a file extension longer than 20 will break
	// external editing (since the extension would be truncated).
	// https://discourse.joplinapp.org/t/troubles-with-webarchive-files-on-ios/10447
	if (maxLength === null) maxLength = 20;
	if (!e || !e.replace) return '';
	return e.replace(/[^a-zA-Z0-9]/g, '').substr(0, maxLength);
}

export function safeFilename(e: string, maxLength: number = null, allowSpaces: boolean = false) {
	if (maxLength === null) maxLength = 32;
	if (!e || !e.replace) return '';
	const regex = allowSpaces ? /[^a-zA-Z0-9\-_\(\)\. ]/g : /[^a-zA-Z0-9\-_\(\)\.]/g;
	const output = e.replace(regex, '_');
	return output.substr(0, maxLength);
}

let friendlySafeFilename_blackListChars = '/\n\r<>:\'"\\|?*#';
for (let i = 0; i < 32; i++) {
	friendlySafeFilename_blackListChars += String.fromCharCode(i);
}

const friendlySafeFilename_blackListNames = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

// The goal of this function is to provide a safe filename, that should work in
// any filesystem, but that's still user friendly, in particular because it
// supports any charset - Chinese, Russian, etc.
//
// "Safe" however doesn't mean it can be safely inserted in any content (HTML,
// Markdown, etc.) - it still needs to be encoded by the calling code according
// to the context.

export function friendlySafeFilename(e: string, maxLength: number = null, preserveExtension: boolean = false) {
	// Although Windows supports paths up to 255 characters, but that includes the filename and its
	// parent directory path. Also there's generally no good reason for dir or file names
	// to be so long, so keep it at 50, which should prevent various errors.
	if (maxLength === null) maxLength = 50;
	if (!e || !e.replace) return _('Untitled');

	let fileExt = '';

	if (preserveExtension) {
		const baseExt = fileExtension(e);
		fileExt = baseExt ? `.${safeFileExtension(baseExt)}` : '';
		e = filename(e);
	}

	let output = '';
	for (let i = 0; i < e.length; i++) {
		const c = e[i];
		if (friendlySafeFilename_blackListChars.indexOf(c) >= 0) {
			output += '_';
		} else {
			output += c;
		}
	}

	if (output.length <= 4) {
		if (friendlySafeFilename_blackListNames.indexOf(output.toUpperCase()) >= 0) {
			output = '___';
		}
	}

	while (output.length) {
		const c = output[output.length - 1];
		if (c === ' ' || c === '.') {
			output = output.substr(0, output.length - 1);
		} else {
			break;
		}
	}

	while (output.length) {
		const c = output[0];
		if (c === ' ') {
			output = output.substr(1, output.length - 1);
		} else {
			break;
		}
	}

	if (!output) return _('Untitled') + fileExt;

	return output.substr(0, maxLength) + fileExt;
}

export function toFileProtocolPath(filePathEncode: string, os: string = null) {
	if (os === null) os = process.platform;

	if (os === 'win32') {
		filePathEncode = filePathEncode.replace(/\\/g, '/'); // replace backslash in windows pathname with slash e.g. c:\temp to c:/temp
		filePathEncode = `/${filePathEncode}`; // put slash in front of path to comply with windows fileURL syntax
	}

	filePathEncode = encodeURI(filePathEncode);
	filePathEncode = filePathEncode.replace(/\+/g, '%2B'); // escape '+' with unicode
	return `file://${filePathEncode.replace(/\'/g, '%27')}`; // escape '(single quote) with unicode, to prevent crashing the html view
}

export function toSystemSlashes(path: string, os: string = null) {
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

export function quotePath(path: string) {
	if (!path) return '';
	if (path.indexOf('"') < 0 && path.indexOf(' ') < 0) return path;
	path = path.replace(/"/, '\\"');
	return `"${path}"`;
}

export function unquotePath(path: string) {
	if (!path.length) return '';
	if (path.length && path[0] === '"') {
		path = path.substr(1, path.length - 2);
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
