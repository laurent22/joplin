// Handle logging strings when running in a WebView.

// Because this will be running both in a WebView and in nodeJS, we need to use
// globalThis in place of window. We need to tell ESLint that we're doing this:
/* global globalThis*/

export function postMessage(name: string, data: any) {
	// Only call postMessage if we're running in a WebView (this code may be called
	// in integration tests).
	(globalThis as any).ReactNativeWebView?.postMessage(JSON.stringify({
		data,
		name,
	}));
}

export function logMessage(...msg: any[]) {
	postMessage('onLog', { value: msg });
}

