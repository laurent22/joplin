
type OnErrorCallback = (errorMessage: string)=> void;

const reportUnhandledErrors = (onError: OnErrorCallback) => {
	window.addEventListener('unhandledrejection', (event) => {
		onError(`Unhandled promise rejection: ${event.reason}. Promise: ${event.promise}.`);
	});

	window.addEventListener('error', (event) => {
		onError(`Error: ${event.message}. ${event.error?.stack ?? ''}`);
	});
};

export default reportUnhandledErrors;
