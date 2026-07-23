const URL = require('url-parse');

const callbackProtocols = ['bahnotes://', 'joplin://'];
const callbackCommands = ['openNote', 'openFolder', 'openTag'];

export function isCallbackUrl(s: string) {
	for (const protocol of callbackProtocols) {
		for (const command of callbackCommands) {
			if (s.startsWith(`${protocol}x-callback-url/${command}?`)) return true;
		}
	}
	return false;
}

export function getNoteCallbackUrl(noteId: string) {
	return `bahnotes://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
}

export function getFolderCallbackUrl(folderId: string) {
	return `bahnotes://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
}

export function getTagCallbackUrl(tagId: string) {
	return `bahnotes://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
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
