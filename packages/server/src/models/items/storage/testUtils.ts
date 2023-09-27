/* eslint-disable jest/require-top-level-describe */

import config from '../../../config';
import { Item } from '../../../services/database/types';
import { CustomErrorCode } from '../../../utils/errors';
import { createUserAndSession, db, makeNoteSerializedBody, models } from '../../../utils/testing/testUtils';
import { Config, StorageDriverConfig, StorageDriverMode } from '../../../utils/types';
import newModelFactory from '../../factory';
import loadStorageDriver from './loadStorageDriver';
import { Context } from './StorageDriverBase';

const newTestModels = (driverConfig: StorageDriverConfig, driverConfigFallback: StorageDriverConfig = null) => {
	const newConfig: Config = {
		...config(),
		storageDriver: driverConfig,
		storageDriverFallback: driverConfigFallback,
	};
	return newModelFactory(db(), newConfig);
};

export function shouldWriteToContentAndReadItBack(driverConfig: StorageDriverConfig) {
	test('should write to content and read it back', async () => {
		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const testModels = newTestModels(driverConfig);
		const driver = await testModels.item().storageDriver();

		const output = await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		const result = output['00000000000000000000000000000001.md'];
		expect(result.error).toBeFalsy();

		const item = await testModels.item().loadWithContent(result.item.id);
		expect(item.content.byteLength).toBe(item.content_size);
		expect(item.content_storage_id).toBe(driver.storageId);

		const rawContent = await driver.read(item.id, { models: models() });
		expect(rawContent.byteLength).toBe(item.content_size);

		const jopItem = testModels.item().itemToJoplinItem(item);
		expect(jopItem.id).toBe('00000000000000000000000000000001');
		expect(jopItem.title).toBe('testing driver');
	});
}

export function shouldDeleteContent(driverConfig: StorageDriverConfig) {
	test('should delete the content', async () => {
		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const testModels = newTestModels(driverConfig);

		const output = await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		const item: Item = output['00000000000000000000000000000001.md'].item;

		expect((await testModels.item().all()).length).toBe(1);
		await testModels.item().delete(item.id);
		expect((await testModels.item().all()).length).toBe(0);
	});
}

export function shouldNotCreateItemIfContentNotSaved(driverConfig: StorageDriverConfig) {
	test('should not create the item if the content cannot be saved', async () => {
		const testModels = newTestModels(driverConfig);
		const driver = await testModels.item().storageDriver();

		const previousWrite = driver.write;
		driver.write = () => { throw new Error('not working!'); };

		try {
			const { user } = await createUserAndSession(1);
			const noteBody = makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing driver',
			});

			const output = await testModels.item().saveFromRawContent(user, [{
				name: '00000000000000000000000000000001.md',
				body: Buffer.from(noteBody),
			}]);

			expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
			expect((await testModels.item().all()).length).toBe(0);
		} finally {
			driver.write = previousWrite;
		}
	});
}

export function shouldNotUpdateItemIfContentNotSaved(driverConfig: StorageDriverConfig) {
	test('should not update the item if the content cannot be saved', async () => {
		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const testModels = newTestModels(driverConfig);
		const driver = await testModels.item().storageDriver();

		await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		const noteBodyMod1 = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'updated 1',
		});

		await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBodyMod1),
		}]);

		const itemMod1 = testModels.item().itemToJoplinItem(await testModels.item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
		expect(itemMod1.title).toBe('updated 1');

		const noteBodyMod2 = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'updated 2',
		});

		const previousWrite = driver.write;
		driver.write = () => { throw new Error('not working!'); };

		try {
			const output = await testModels.item().saveFromRawContent(user, [{
				name: '00000000000000000000000000000001.md',
				body: Buffer.from(noteBodyMod2),
			}]);

			expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
			const itemMod2 = testModels.item().itemToJoplinItem(await testModels.item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
			expect(itemMod2.title).toBe('updated 1'); // Check it has not been updated
		} finally {
			driver.write = previousWrite;
		}
	});
}

export function shouldSupportFallbackDriver(driverConfig: StorageDriverConfig, fallbackDriverConfig: StorageDriverConfig) {
	test('should support fallback content drivers', async () => {
		const { user } = await createUserAndSession(1);

		const testModels = newTestModels(driverConfig);
		const driver = await testModels.item().storageDriver();

		const output = await testModels.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing',
			})),
		}]);

		const itemId = output['00000000000000000000000000000001.md'].item.id;

		let previousByteLength = 0;

		{
			const content = await driver.read(itemId, { models: models() });
			expect(content.byteLength).toBeGreaterThan(10);
			previousByteLength = content.byteLength;
		}

		const testModelWithFallback = newTestModels(driverConfig, fallbackDriverConfig);

		// If the item content is not on the main content driver, it should get
		// it from the fallback one.
		const itemFromDb = await testModelWithFallback.item().loadWithContent(itemId);
		expect(itemFromDb.content.byteLength).toBe(previousByteLength);

		// When writing content, it should use the main content driver, and set
		// the content for the fallback one to "".
		await testModelWithFallback.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing1234',
			})),
		}]);

		{
			const fallbackDriver = await testModelWithFallback.item().storageDriverFallback();

			// Check that it has cleared the fallback driver content
			const context: Context = { models: models() };
			const fallbackContent = await fallbackDriver.read(itemId, context);
			expect(fallbackContent.byteLength).toBe(0);

			// Check that it has written to the main driver content
			const mainContent = await driver.read(itemId, context);
			expect(mainContent.byteLength).toBe(previousByteLength + 4);
		}
	});
}

export function shouldSupportFallbackDriverInReadWriteMode(driverConfig: StorageDriverConfig, fallbackDriverConfig: StorageDriverConfig) {
	test('should support fallback content drivers in rw mode', async () => {
		if (fallbackDriverConfig.mode !== StorageDriverMode.ReadAndWrite) throw new Error('Content driver must be configured in RW mode for this test');

		const { user } = await createUserAndSession(1);

		const testModelWithFallback = newTestModels(driverConfig, fallbackDriverConfig);

		const output = await testModelWithFallback.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing',
			})),
		}]);

		const itemId = output['00000000000000000000000000000001.md'].item.id;

		{
			const driver = await testModelWithFallback.item().storageDriver();
			const fallbackDriver = await testModelWithFallback.item().storageDriverFallback();

			// Check that it has written the content to both drivers
			const context: Context = { models: models() };
			const fallbackContent = await fallbackDriver.read(itemId, context);
			expect(fallbackContent.byteLength).toBeGreaterThan(10);

			const mainContent = await driver.read(itemId, context);
			expect(mainContent.toString()).toBe(fallbackContent.toString());
		}
	});
}

export function shouldUpdateContentStorageIdAfterSwitchingDriver(oldDriverConfig: StorageDriverConfig, newDriverConfig: StorageDriverConfig) {
	test('should update content storage ID after switching driver', async () => {
		if (oldDriverConfig.type === newDriverConfig.type) throw new Error('Drivers must be different for this test');

		const { user } = await createUserAndSession(1);

		const oldDriverModel = newTestModels(oldDriverConfig);
		const newDriverModel = newTestModels(newDriverConfig);
		const oldDriver = await oldDriverModel.item().storageDriver();
		const newDriver = await newDriverModel.item().storageDriver();

		const output = await oldDriverModel.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing',
			})),
		}]);

		const itemId = output['00000000000000000000000000000001.md'].item.id;

		expect((await oldDriverModel.item().load(itemId)).content_storage_id).toBe(oldDriver.storageId);

		await newDriverModel.item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(makeNoteSerializedBody({
				id: '00000000000000000000000000000001',
				title: 'testing',
			})),
		}]);

		expect(await newDriverModel.item().count()).toBe(1);
		expect((await oldDriverModel.item().load(itemId)).content_storage_id).toBe(newDriver.storageId);
	});
}

export function shouldThrowNotFoundIfNotExist(driverConfig: StorageDriverConfig) {
	test('should throw not found if item does not exist', async () => {
		const driver = await loadStorageDriver(driverConfig, db());

		let error: any = null;
		try {
			await driver.read('doesntexist', { models: models() });
		} catch (e) {
			error = e;
		}

		expect(error).toBeTruthy();
		expect(error.code).toBe(CustomErrorCode.NotFound);
	});
}
