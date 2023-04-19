import { Link } from '../MdToHtml';
import { toForwardSlashes } from '../pathUtils';
import { LinkIndexes } from './rules/link_close';
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;

export interface Options {
	audioPlayerEnabled: boolean;
	videoPlayerEnabled: boolean;
	pdfViewerEnabled: boolean;
	useCustomPdfViewer: boolean;
	noteId: string;
	vendorDir: string;
	theme: any;
}

function resourceUrl(resourceFullPath: string): string {
	if (resourceFullPath.indexOf('http://') === 0 || resourceFullPath.indexOf('https://')) return resourceFullPath;
	return `file://${toForwardSlashes(resourceFullPath)}`;
}

export default function(link: Link, options: Options, _linkIndexes: LinkIndexes) {
	const resource = link.resource;

	if (!link.resourceReady || !resource || !resource.mime) return '';

	const escapedResourcePath = htmlentities(resourceUrl(link.resourceFullPath));
	const escapedMime = htmlentities(resource.mime);

	if (options.videoPlayerEnabled && resource.mime.indexOf('video/') === 0) {
		return `
			<video class="media-player media-video" controls>
				<source src="${escapedResourcePath}" type="${escapedMime}">
			</video>
		`;
	}

	if (options.audioPlayerEnabled && resource.mime.indexOf('audio/') === 0) {
		// We want to support both audio/x-flac and audio/flac MIME types, but chromium only supports audio/flac
		// https://github.com/laurent22/joplin/issues/6434
		const escapedAudioMime = escapedMime === 'audio/x-flac' ? 'audio/flac' : escapedMime;
		return `
			<audio class="media-player media-audio" controls>
				<source src="${escapedResourcePath}" type="${escapedAudioMime}">
			</audio>
		`;
	}

	if (options.pdfViewerEnabled && resource.mime === 'application/pdf') {
		return `<object data="${escapedResourcePath}" class="media-player media-pdf" type="${escapedMime}"></object>`;
	}

	return '';
}
