/* eslint-disable import/prefer-default-export */

import * as fs from 'fs-extra';

export async function safeRemove(filePath: string) {
	try {
		await fs.remove(filePath);
	} catch (error) {
		// Ignore
	}
}
