
const makeSandboxedIframe = (
	bodyHtml: string,
	scripts: string[],
) => {
	const iframe = document.createElement('iframe');

	// allow-modals: Allows confirm/alert dialogs.
	iframe.setAttribute('sandbox', 'allow-scripts allow-modals');

	iframe.addEventListener('load', async () => {
		iframe.contentWindow.postMessage({
			kind: 'add-script',
			scripts,
		}, '*');
	}, { once: true });

	iframe.srcdoc = `
		<!DOCTYPE html>
		<html>
		<head></head>
		<body>
			<script>
				"use strict";
				window.onmessage = (event) => {
					console.log('got message', event);
					if (event.source !== parent) {
						console.log('Ignoring message: wrong source');
						return;
					}
					if (event.data.kind !== 'add-script') {
						console.log('Ignoring message: wrong type', event.data.kind);
						return;
					}

					console.log('Adding plugin scripts...');
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
