import { RenderSettings, RendererSetupOptions } from '../Renderer';
import { WebViewLib } from '../types';

interface ExtendedWindow extends Window {
	webviewLib: WebViewLib;
}

declare const window: ExtendedWindow;

const afterFullPageRender = (
	setupOptions: RendererSetupOptions,
	renderSettings: RenderSettings,
) => {
	const readyStateCheckInterval = setInterval(() => {
		if (document.readyState === 'complete') {
			clearInterval(readyStateCheckInterval);
			if (setupOptions.settings.resourceDownloadMode === 'manual') {
				window.webviewLib.setupResourceManualDownload();
			}

			const hash = renderSettings.noteHash;
			const initialScrollPercent = renderSettings.initialScrollPercent;

			// Don't scroll to a hash if we're given initial scroll (initial scroll
			// overrides scrolling to a hash).
			if ((initialScrollPercent ?? null) !== null) {
				const scrollingElement = document.scrollingElement ?? document.documentElement;
				scrollingElement.scrollTop = initialScrollPercent * scrollingElement.scrollHeight;
			} else if (hash) {
				// Gives it a bit of time before scrolling to the anchor
				// so that images are loaded.
				setTimeout(() => {
					const e = document.getElementById(hash);
					if (!e) {
						console.warn('Cannot find hash', hash);
						return;
					}
					e.scrollIntoView();
				}, 500);
			}
		}
	}, 10);
};

export default afterFullPageRender;
