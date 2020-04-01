// eslint-disable-next-line no-unused-vars
const ipcProxySendToHost = (methodName, arg) => {
	console.info('TinyMCE ipcProxySendToHost', methodName, arg);
	// parent.postMessage({ target: 'main', name: methodName, args: [ arg ] }, '*');
};
