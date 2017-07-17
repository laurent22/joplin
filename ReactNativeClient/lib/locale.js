import { sprintf } from 'sprintf-js';

// This function does nothing for now, but later will return
// a different string depending on the language.
function _(s, ...args) {
	return sprintf(s, ...args);
}

function loadLocale(locale) {
	
}

export { _ };