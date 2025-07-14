interface Options {
	count: number;
	onFail: (error: Error)=> Promise<void>;
}

const retryWithCount = async (task: ()=> Promise<void>, { count, onFail }: Options) => {
	let lastError: Error|null = null;
	for (let retry = 0; retry < count; retry ++) {
		try {
			return await task();
		} catch (error) {
			await onFail(error);
			lastError = error;
		}
	}

	if (lastError) throw lastError;
};

export default retryWithCount;

