
interface Options {
	maxRetries: number;
}

const retryOnFailure = async <T> (callback: ()=> Promise<T>, { maxRetries }: Options): Promise<T> => {
	let lastError: Error|null = null;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await callback();
		} catch (error) {
			console.error('retry failed:', error, `Retrying... ${i + 1}/${maxRetries}`);
			lastError = error;
		}
	}

	throw lastError;
};

export default retryOnFailure;
