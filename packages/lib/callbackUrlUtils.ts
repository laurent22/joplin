const URL = require('url-parse');

export function isCallbackUrl(s: string) {
	return s.startsWith('joplin://x-callback-url/openNote?') ||
		s.startsWith('joplin://x-callback-url/openFolder?') ||
		s.startsWith('joplin://x-callback-url/openTag?');
}

export function getNoteCallbackUrl(noteId: string) {
	return `joplin://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
}

export function getFolderCallbackUrl(folderId: string) {
	return `joplin://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
}

export function getTagCallbackUrl(tagId: string) {
	return `joplin://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
}

export const enum CallbackUrlCommand {
	OpenNote = 'openNote',
	OpenFolder = 'openFolder',
	OpenTag = 'openTag',
}

export interface CallbackUrlInfo {
	command: CallbackUrlCommand;
	params: Record<string, string>;
}

export function parseCallbackUrl(s: string): CallbackUrlInfo {
	if (!isCallbackUrl(s)) throw new Error(`Invalid callback url ${s}`);
	const url = new URL(s, true);
	return {
		command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1) as CallbackUrlCommand,
		params: url.query,
	};
}
