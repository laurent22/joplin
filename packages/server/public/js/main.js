// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
function onDocumentReady(fn) {
	if (document.readyState != 'loading') {
		fn();
	} else {
		document.addEventListener('DOMContentLoaded', fn);
	}
}
