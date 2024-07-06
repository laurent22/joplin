
interface Options {
	bodyHtml: string;
	headHtml: string;
	scripts: string[];
	permissions?: string;
	allow?: string;
}

// allow-modals: Allows confirm/alert dialogs.
const makeSandboxedIframe = ({ bodyHtml, headHtml, scripts, permissions = 'allow-scripts allow-modals', allow = '' }: Options) => {
	const iframe = document.createElement('iframe');

	iframe.setAttribute('sandbox', permissions);
	if (allow) {
		iframe.allow = allow;
	}

	iframe.addEventListener('load', async () => {
		iframe.contentWindow.postMessage({
			kind: 'add-script',
			scripts,
		}, '*');
	}, { once: true });

	iframe.srcdoc = `
		<!DOCTYPE html>
		<html>
		<head>${headHtml}</head>
		<body>
			<script>
				"use strict";
				window.onmessage = (event) => {
					if (event.source !== parent) {
						console.log('Ignoring message: wrong source');
						return;
					}
					if (event.data.kind !== 'add-script') {
						console.log('Ignoring message: wrong type', event.data.kind);
						return;
					}

					console.log('Adding scripts...');
					window.onmessage = undefined;
					for (const scriptText of event.data.scripts) {
						const scriptElem = document.createElement('script');
						scriptElem.appendChild(document.createTextNode(scriptText));
						document.head.appendChild(scriptElem);
					}
				};
			</script>

			${bodyHtml}
		</body>
		</html>
	`;

	return {
		iframe,
		loadPromise: new Promise<void>(resolve => {
			iframe.addEventListener('load', () => resolve(), { once: true });
		}),
	};
};

export default makeSandboxedIframe;
