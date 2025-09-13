import Logger from '@joplin/utils/Logger';
import { msleep } from '@joplin/utils/time';

const logger = Logger.create('retryWithCount');

interface Options {
	count: number;
	delayOnFailure?: (retryCount: number)=> number;
	onFail: (error: Error)=> void|Promise<void>;
}

const retryWithCount = async (task: ()=> Promise<void>, { count, delayOnFailure, onFail }: Options) => {
	let lastError: Error|null = null;
	for (let retry = 0; retry < count; retry ++) {
		try {
			return await task();
		} catch (error) {
			await onFail(error);
			lastError = error;

			const willRetry = retry + 1 < count;
			const delay = willRetry && delayOnFailure ? delayOnFailure(retry + 1) : 0;
			if (delay) {
				logger.info(`Retrying after ${delay}ms...`);
				await msleep(delay);
			}
		}
	}

	if (lastError) throw lastError;
};

export default retryWithCount;

