export function isCallbackUrl(s: string) {
	return s.startsWith('joplin://x-callback-url/');
}

export function getNoteUrl(noteId: string) {
	return `joplin://x-callback-url/openNote?id=${noteId}`;
}

export function getFolderUrl(folderId: string) {
	return `joplin://x-callback-url/openFolder?id=${folderId}`;
}

export function getTagUrl(tagId: string) {
	return `joplin://x-callback-url/openTag?id=${tagId}`;
}

export type Command = 'openNote' | 'openFolder' | 'openTag';

export interface UlrInfo {
    command: Command;
    params: any;
}

export function parseUrl(s: string): UlrInfo {
	if (!s.startsWith('joplin://')) return null;
	const url = new URL(s);

	const params: any = {};
	for (const [key, value] of url.searchParams) {
		params[key] = value;
	}

	return {
		command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1) as Command,
		params,
	};
}
