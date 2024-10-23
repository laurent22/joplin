const { Buffer } = require('buffer');
const URL = require('url-parse');

function base64UriEncode(s: string) {
	return Buffer.from(s, 'hex').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UriDecode(s: string) {
	if (/[^a-zA-Z0-9_-]/.test(s)) {
		throw new Error(`Invalid base64uri string ${s}`);
	}
	return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('hex');
}

export function isCallbackUrl(s: string) {
	return s.startsWith('joplin://x-callback-url/openNote?') ||
		s.startsWith('joplin://x-callback-url/openFolder?') ||
		s.startsWith('joplin://x-callback-url/openTag?') ||
		s.startsWith('joplin://note/') ||
		s.startsWith('joplin://folder/') ||
		s.startsWith('joplin://tag/');
}

export function getNoteCallbackUrl(noteId: string) {
	// return `joplin://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
	return `joplin://note/${base64UriEncode(noteId)}`;
}

export function getFolderCallbackUrl(folderId: string) {
	// return `joplin://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
	return `joplin://folder/${base64UriEncode(folderId)}`;
}

export function getTagCallbackUrl(tagId: string) {
	// return `joplin://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
	return `joplin://tag/${base64UriEncode(tagId)}`;
}

export const enum CallbackUrlCommand {
	OpenNote = 'openNote',
	OpenFolder = 'openFolder',
	OpenTag = 'openTag',
}

const ShortActionsMap = {
	note: 'openNote',
	folder: 'openFolder',
	tag: 'openTag',
};

export interface CallbackUrlInfo {
	command: CallbackUrlCommand;
	params: Record<string, string>;
}

export function parseCallbackUrl(s: string): CallbackUrlInfo {
	if (!isCallbackUrl(s)) throw new Error(`Invalid callback url ${s}`);
	const url = new URL(s, true);

	if (url.hostname in ShortActionsMap) {
		try {
			return {
				command: ShortActionsMap[url.hostname as keyof typeof ShortActionsMap] as CallbackUrlCommand,
				params: { id: base64UriDecode(url.pathname.substring(url.pathname.lastIndexOf('/') + 1)) },
			};
		} catch (e) {
			throw new Error(`Invalid callback url ${s}`);
		}
	}

	return {
		command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1) as CallbackUrlCommand,
		params: url.query,
	};
}
