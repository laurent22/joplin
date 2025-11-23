"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCallbackUrl = isCallbackUrl;
exports.getNoteCallbackUrl = getNoteCallbackUrl;
exports.getFolderCallbackUrl = getFolderCallbackUrl;
exports.getTagCallbackUrl = getTagCallbackUrl;
exports.parseCallbackUrl = parseCallbackUrl;
const URL = require('url-parse');
function isCallbackUrl(s) {
    return s.startsWith('joplin://x-callback-url/openNote?') ||
        s.startsWith('joplin://x-callback-url/openFolder?') ||
        s.startsWith('joplin://x-callback-url/openTag?');
}
function getNoteCallbackUrl(noteId) {
    return `joplin://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
}
function getFolderCallbackUrl(folderId) {
    return `joplin://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
}
function getTagCallbackUrl(tagId) {
    return `joplin://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
}
function parseCallbackUrl(s) {
    if (!isCallbackUrl(s))
        throw new Error(`Invalid callback url ${s}`);
    const url = new URL(s, true);
    return {
        command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1),
        params: url.query,
    };
}
