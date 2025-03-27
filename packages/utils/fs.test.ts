/* eslint-disable import/prefer-default-export */

import { mkdirp } from 'fs-extra';
import { FileLocker } from './fs';
import { msleep, Second } from './time';

const baseTempDir = `${__dirname}/../app-cli/tests/tmp`;

export const createTempDir = async () => {
	const p = `${baseTempDir}/${Date.now()}`;
	await mkdirp(p);
	return p;
};

describe('fs', () => {

	it('should lock files', async () => {
		const dirPath = await createTempDir();
		const filePath = `${dirPath}/test.lock`;

		const locker1 = new FileLocker(filePath, {
			interval: 10 * Second,
		});

		expect(await locker1.lock()).toBe(true);
		expect(await locker1.lock()).toBe(false);

		locker1.unlockSync();

		const locker2 = new FileLocker(filePath, {
			interval: 1.5 * Second,
		});

		expect(await locker2.lock()).toBe(true);
		locker2.stopMonitoring_();

		const locker3 = new FileLocker(filePath, {
			interval: 1.5 * Second,
		});

		await msleep(2 * Second);

		expect(await locker3.lock()).toBe(true);

		locker3.unlockSync();
	});

});
