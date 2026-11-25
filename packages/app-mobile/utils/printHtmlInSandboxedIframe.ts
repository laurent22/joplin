import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';

const printHtmlInSandboxedIframe = (html: string) => {
	const parsedHtml = new DOMParser().parseFromString(html, 'text/html');
	const { iframe } = makeSandboxedIframe({
		headHtml: parsedHtml.head.innerHTML,
		bodyHtml: parsedHtml.body.innerHTML,
		// The sandbox has an opaque origin, so printing must run inside the iframe.
		scripts: [`
			window.addEventListener('afterprint', () => {
				parent.postMessage({ kind: 'note-print-finished' }, '*');
			}, { once: true });
			window.print();
		`],
	});
	iframe.style.display = 'none';
	const onPrintFinished = (event: MessageEvent) => {
		if (event.source === iframe.contentWindow && event.data?.kind === 'note-print-finished') cleanup();
	};
	const cleanup = () => {
		window.removeEventListener('message', onPrintFinished);
		window.clearTimeout(cleanupTimeout);
		iframe.remove();
	};
	const cleanupTimeout = window.setTimeout(cleanup, 120_000);
	window.addEventListener('message', onPrintFinished);
	document.body.appendChild(iframe);
};

export default printHtmlInSandboxedIframe;
