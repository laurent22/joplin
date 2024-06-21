/* eslint no-useless-escape: 0*/

import { _ } from './locale';
import { fileExtension, filename, safeFileExtension } from '@joplin/utils/path';
export * from '@joplin/utils/path';

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

export function friendlySafeFilename(e: string, maxLength: number = null, preserveExtension = false) {
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
