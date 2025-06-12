
import { ElectronApplication } from '@playwright/test';
import type { PageFunctionOn } from 'playwright-core/types/structs';
import type * as ElectronType from 'electron';
import retryOnFailure from './retryOnFailure';

const evaluateWithRetry = async <ReturnType, Arg> (
	app: ElectronApplication,
	pageFunction: PageFunctionOn<typeof ElectronType, Arg, ReturnType>,
	arg: Arg,
) => {
	await retryOnFailure(async () => {
		return await app.evaluate(pageFunction, arg);
	}, { maxRetries: 3 });
};

export default evaluateWithRetry;
