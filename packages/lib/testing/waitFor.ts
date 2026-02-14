

// Waits for callback to not throw. Similar to react-native-testing-library's waitFor, but works better
// with Joplin's mix of real and fake Jest timers.
const realSetTimeout = setTimeout;
const waitFor = async (callback: ()=> void|Promise<void>) => {
	const timeout = 10_000;
	const startTime = performance.now();
	let passed = false;
	let lastError: Error|null = null;

	while (!passed && performance.now() - startTime < timeout) {
		try {
			await callback();
			passed = true;
			lastError = null;
		} catch (error) {
			lastError = error;

			await new Promise<void>(resolve => {
				realSetTimeout(() => resolve(), 10);
			});
		}
	}

	if (lastError) {
		throw lastError;
	}
};

export default waitFor;
