import { _ } from '@joplin/lib/locale';
import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';
import Logger from '@joplin/utils/Logger';
import FileViewer from 'react-native-file-viewer';
import shareFile from '../../utils/shareFile';

enum DisplayType {
	Download = 'download',
	Video = 'video',
	Image = 'image',
	Pdf = 'pdf',
	Inline = 'inline',
}

const mimeTypeToDisplayType = (mime: string) => {
	if (mime.match(/^audio|^video/)) {
		return DisplayType.Video;
	} else if (mime.match(/^image/)) {
		return DisplayType.Image;
	} else if (mime === 'application/pdf') {
		return DisplayType.Pdf;
	} else if (
		// MIME types known to be safe (e.g. can't load JS that can be used for phishing)
		mime === 'text/plain' || mime === 'application/json'
	) {
		return DisplayType.Inline;
	}
	return DisplayType.Download;
};

const openWebPreviewWindow = async (file: File, item: ResourceEntity, displayType: DisplayType) => {
	const previewWindow = window.open('about:blank', '_blank');
	if (!previewWindow) {
		throw new Error(_('Failed to open preview window'));
	}

	const fileDisplayName = item.filename.trim() || file.name;
	previewWindow.document.title = _('%s - Preview', substrWithEllipsis(fileDisplayName, 0, 10));
	const meta = document.createElement('meta');
	meta.name = 'viewport';
	meta.content = 'initial-scale=1,width=device-width';
	previewWindow.document.head.appendChild(meta);
	const styles = document.createElement('style');
	styles.appendChild(document.createTextNode(`
		iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: 100vw;
			height: 100vh;
			border: none;
		}

		@media screen and (prefers-color-scheme: dark) {
			:root {
				background: #222;
				color: white;
			}
		}
	`));
	previewWindow.document.body.appendChild(styles);

	const frame = makeSandboxedIframe({
		bodyHtml: `
			<style>
				body {
					padding: 0;
					margin: 0;
				}
				video, img {
					max-width: 100vw;
					max-height: 100vh;
				}
			</style>
			<script>
			"use strict";
			const listener = (event) => {
				const data = event.data;
				if (!data?.buffer) return;
				window.removeEventListener('message', listener);

				const blob = new Blob([data.buffer], { type: data.type });
				const url = URL.createObjectURL(blob);

				const displayType = data.displayType;
				if (displayType === 'video') {
					// Audio/video need the blob URL to continue existing for seek to work.
					// Open these in an audio/video frame that keeps the blob around:
					const video = document.createElement('video');
					video.setAttribute('controls', 'true');
					video.src = url;
					document.body.appendChild(video);
				} else if (displayType === 'image') {
					const image = document.createElement('img');
					image.src = url;
					document.body.appendChild(image);
				} else if (displayType === 'pdf' || displayType === 'inline') {
					// For PDF preview to work, PDFs need to be opened in the toplevel frame in Chrome.
					window.open(url, '_top');
				} else {
					console.warn('unknown display type', displayType);
				}
			};
			window.addEventListener('message', listener);
			</script>
		`,
		headHtml: '',
		scripts: [],
		// Do not include allow-same-origin: Doing so would create the blob with the same origin
		// as the toplevel frame, which is a security risk.
		// allow-top-navigation: Needed to allow redirecting the newly-opened page. This is required
		// for PDFs, which don't display correctly in sandboxed <iframe>s.
		permissions: 'allow-scripts allow-top-navigation allow-downloads',
	});
	previewWindow.document.body.appendChild(frame.iframe);

	const buffer = await file.arrayBuffer();
	await frame.loadPromise;
	frame.iframe.contentWindow.postMessage({
		buffer, type: file.type, displayType, path: fileDisplayName,
	}, '*', [buffer]);
};

const logger = Logger.create('showResource');

const showResource = async (item: ResourceEntity) => {
	const resourcePath = Resource.fullPath(item);
	logger.info(`Opening resource: ${resourcePath}`);

	if (shim.mobilePlatform() === 'web') {
		const file = await shim.fsDriver().fileAtPath(resourcePath);

		const displayType = mimeTypeToDisplayType(file.type);
		if (displayType === DisplayType.Download) {
			return shareFile(resourcePath, file.type);
		}

		await openWebPreviewWindow(file, item, displayType);
	} else {
		await FileViewer.open(resourcePath);
	}
};

export default showResource;
