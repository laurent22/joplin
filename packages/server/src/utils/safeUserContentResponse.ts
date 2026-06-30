import { friendlySafeFilename } from '@joplin/lib/path-utils';

// Anything not in this allow-list (notably image/svg+xml and text/html) is
// served as application/octet-stream with attachment disposition, to prevent
// script execution from user-uploaded resources.
const safeInlineMimeTypes = new Set<string>([
	'image/png',
	'image/jpeg',
	'image/jpg',
	'image/gif',
	'image/webp',
	'image/bmp',
	'image/x-icon',
	'image/vnd.microsoft.icon',
	'image/avif',
	'image/heic',
	'image/heif',
	'audio/mpeg',
	'audio/mp4',
	'audio/ogg',
	'audio/wav',
	'audio/webm',
	'audio/flac',
	'video/mp4',
	'video/webm',
	'video/ogg',
	'application/pdf',
]);

const normalizeMime = (mime: string) => {
	if (!mime) return '';
	return mime.split(';')[0].trim().toLowerCase();
};

const safeFilename = (filename: string) => {
	const encoded = encodeURIComponent(friendlySafeFilename(filename || '', null, true));
	return `filename*=UTF-8''${encoded}; filename="${encoded}"`;
};

// Returns safe response headers for serving user-uploaded content. All four
// fields must be applied together.
export default (rawMime: string, filename: string) => {
	const mime = normalizeMime(rawMime);
	const isSafeInline = safeInlineMimeTypes.has(mime);

	const outputMime = isSafeInline ? mime : 'application/octet-stream';
	const disposition = isSafeInline ? 'inline' : 'attachment';

	return {
		mime: outputMime,
		contentDisposition: `${disposition}; ${safeFilename(filename)}`,
		contentSecurityPolicy: 'default-src \'none\'; img-src \'self\' data:; media-src \'self\' data:; style-src \'unsafe-inline\'; sandbox',
		xContentTypeOptions: 'nosniff',
	};
};
