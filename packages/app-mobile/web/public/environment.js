// Change to enable or disable React Native dev mode.
window.__DEV__ = window.location.origin.includes('localhost');

// Silences errors related to generated code.
window.exports = {};

if (__DEV__) {
	document.title = 'Joplin DEV';
}
