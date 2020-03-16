/* eslint no-useless-escape: 0*/

const { _ } = require('lib/locale');

function dirname(path) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	s.pop();
	return s.join('/');
}

function basename(path) {
	if (!path) throw new Error('Path is empty');
	const s = path.split(/\/|\\/);
	return s[s.length - 1];
}

function filename(path, includeDir = false) {
	if (!path) throw new Error('Path is empty');
	let output = includeDir ? path : basename(path);
	if (output.indexOf('.') < 0) return output;

	output = output.split('.');
	output.pop();
	return output.join('.');
}

function fileExtension(path) {
	if (!path) throw new Error('Path is empty');

	const output = path.split('.');
	if (output.length <= 1) return '';
	return output[output.length - 1];
}

function isHidden(path) {
	const b = basename(path);
	if (!b.length) throw new Error(`Path empty or not a valid path: ${path}`);
	return b[0] === '.';
}

function safeFileExtension(e, maxLength = null) {
	if (maxLength === null) maxLength = 8;
	if (!e || !e.replace) return '';
	return e.replace(/[^a-zA-Z0-9]/g, '').substr(0, maxLength);
}

function safeFilename(e, maxLength = null, allowSpaces = false) {
	if (maxLength === null) maxLength = 32;
	if (!e || !e.replace) return '';
	const regex = allowSpaces ? /[^a-zA-Z0-9\-_\(\)\. ]/g : /[^a-zA-Z0-9\-_\(\)\.]/g;
	const output = e.replace(regex, '_');
	return output.substr(0, maxLength);
}

let friendlySafeFilename_blackListChars = '/<>:\'"\\|?*';
for (let i = 0; i < 32; i++) {
	friendlySafeFilename_blackListChars += String.fromCharCode(i);
}

const friendlySafeFilename_blackListNames = ['.', '..', 'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

function friendlySafeFilename(e, maxLength = null) {
	if (maxLength === null) maxLength = 255;
	if (!e || !e.replace) return _('Untitled');

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

	if (!output) return _('Untitled');

	return output.substr(0, maxLength);
}

function toFileProtocolPath(filePathEncode, os = null) {
	if (os === null) os = process.platform;

	if (os === 'win32') {
		filePathEncode = filePathEncode.replace(/\\/g, '/'); // replace backslash in windows pathname with slash e.g. c:\temp to c:/temp
		filePathEncode = `/${filePathEncode}`; // put slash in front of path to comply with windows fileURL syntax
	}

	filePathEncode = encodeURI(filePathEncode);
	filePathEncode = filePathEncode.replace(/\+/g, '%2B'); // escape '+' with unicode
	filePathEncode = filePathEncode.replace(/%20/g, '+'); // switch space (%20) with '+'. To comply with syntax used by joplin, see urldecode_(str) in MdToHtml.js
	return `file://${filePathEncode.replace(/\'/g, '%27')}`; // escape '(single quote) with unicode, to prevent crashing the html view
}

function toSystemSlashes(path, os = null) {
	if (os === null) os = process.platform;
	if (os === 'win32') return path.replace(/\//g, '\\');
	return path.replace(/\\/g, '/');
}

function rtrimSlashes(path) {
	return path.replace(/[\/\\]+$/, '');
}

function ltrimSlashes(path) {
	return path.replace(/^\/+/, '');
}

function quotePath(path) {
	if (!path) return '';
	if (path.indexOf('"') < 0 && path.indexOf(' ') < 0) return path;
	path = path.replace(/"/, '\\"');
	return `"${path}"`;
}

function unquotePath(path) {
	if (!path.length) return '';
	if (path.length && path[0] === '"') {
		path = path.substr(1, path.length - 2);
	}
	path = path.replace(/\\"/, '"');
	return path;
}

function extractExecutablePath(cmd) {
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

module.exports = { toFileProtocolPath, extractExecutablePath, basename, dirname, filename, isHidden, fileExtension, safeFilename, friendlySafeFilename, safeFileExtension, toSystemSlashes, rtrimSlashes, ltrimSlashes, quotePath, unquotePath };
