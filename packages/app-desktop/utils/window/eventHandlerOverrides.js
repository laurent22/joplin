// TODO: These are already partially replaced by Electron main-process
// event handlers. In the future, these may be possible to remove.

// Disable drag and drop of links inside application (which would
// open it as if the whole app was a browser)
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

// Disable middle-click (which would open a new browser window, but we don't want this)
document.addEventListener('auxclick', event => event.preventDefault());

// Each link (rendered as a button or list item) has its own custom click event
// so disable the default. In particular this will disable Ctrl+Clicking a link
// which would open a new browser window.
document.addEventListener('click', (event) => {
	// We don't apply this to labels and inputs because it would break
	// checkboxes. Such a global event handler is probably not a good idea
	// anyway but keeping it for now, as it doesn't seem to break anything else.
	// https://github.com/facebook/react/issues/13477#issuecomment-489274045
	if (['LABEL', 'INPUT'].includes(event.target.nodeName)) return;

	event.preventDefault();
});
