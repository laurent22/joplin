
import { ElectronApplication } from '@playwright/test';
import type { PageFunctionOn } from 'playwright-core/types/structs';
import type * as ElectronType from 'electron';

const evaluateWithRetry = async <ReturnType, Arg> (
	app: ElectronApplication,
	pageFunction: PageFunctionOn<typeof ElectronType, Arg, ReturnType>,
	arg: Arg,
) => {
	let lastError;
	const maxRetries = 3;
	for (let retryIndex = 0; retryIndex < maxRetries; retryIndex ++) {
		try {
			return await app.evaluate(pageFunction, arg);
		} catch (error) {
			console.error('app.evaluate failed:', error, `Retrying... ${retryIndex}/${maxRetries}`);
			lastError = error;
		}
	}
	throw lastError;
};

export default evaluateWithRetry;
