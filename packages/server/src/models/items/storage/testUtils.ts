import { Item } from '../../../services/database/types';
import { createUserAndSession, makeNoteSerializedBody, models } from '../../../utils/testing/testUtils';
import { StorageDriverMode } from '../../../utils/types';
import StorageDriverBase, { Context } from './StorageDriverBase';

const testModels = (driver: StorageDriverBase) => {
	return models({ storageDriver: driver });
};

export async function shouldWriteToContentAndReadItBack(driver: StorageDriverBase) {
	const { user } = await createUserAndSession(1);
	const noteBody = makeNoteSerializedBody({
		id: '00000000000000000000000000000001',
		title: 'testing driver',
	});

	const output = await testModels(driver).item().saveFromRawContent(user, [{
		name: '00000000000000000000000000000001.md',
		body: Buffer.from(noteBody),
	}]);

	const result = output['00000000000000000000000000000001.md'];
	expect(result.error).toBeFalsy();

	const item = await testModels(driver).item().loadWithContent(result.item.id);
	expect(item.content.byteLength).toBe(item.content_size);
	expect(item.content_storage_id).toBe(driver.storageId);

	const rawContent = await driver.read(item.id, { models: models() });
	expect(rawContent.byteLength).toBe(item.content_size);

	const jopItem = testModels(driver).item().itemToJoplinItem(item);
	expect(jopItem.id).toBe('00000000000000000000000000000001');
	expect(jopItem.title).toBe('testing driver');
}

export async function shouldDeleteContent(driver: StorageDriverBase) {
	const { user } = await createUserAndSession(1);
	const noteBody = makeNoteSerializedBody({
		id: '00000000000000000000000000000001',
		title: 'testing driver',
	});

	const output = await testModels(driver).item().saveFromRawContent(user, [{
		name: '00000000000000000000000000000001.md',
		body: Buffer.from(noteBody),
	}]);

	const item: Item = output['00000000000000000000000000000001.md'].item;

	expect((await testModels(driver).item().all()).length).toBe(1);
	await testModels(driver).item().delete(item.id);
	expect((await testModels(driver).item().all()).length).toBe(0);
}

export async function shouldNotCreateItemIfContentNotSaved(driver: StorageDriverBase) {
	const previousWrite = driver.write;
	driver.write = () => { throw new Error('not working!'); };

	try {
		const { user } = await createUserAndSession(1);
		const noteBody = makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing driver',
		});

		const output = await testModels(driver).item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBody),
		}]);

		expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
		expect((await testModels(driver).item().all()).length).toBe(0);
	} finally {
		driver.write = previousWrite;
	}
}

export async function shouldNotUpdateItemIfContentNotSaved(driver: StorageDriverBase) {
	const { user } = await createUserAndSession(1);
	const noteBody = makeNoteSerializedBody({
		id: '00000000000000000000000000000001',
		title: 'testing driver',
	});

	await testModels(driver).item().saveFromRawContent(user, [{
		name: '00000000000000000000000000000001.md',
		body: Buffer.from(noteBody),
	}]);

	const noteBodyMod1 = makeNoteSerializedBody({
		id: '00000000000000000000000000000001',
		title: 'updated 1',
	});

	await testModels(driver).item().saveFromRawContent(user, [{
		name: '00000000000000000000000000000001.md',
		body: Buffer.from(noteBodyMod1),
	}]);

	const itemMod1 = testModels(driver).item().itemToJoplinItem(await testModels(driver).item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
	expect(itemMod1.title).toBe('updated 1');

	const noteBodyMod2 = makeNoteSerializedBody({
		id: '00000000000000000000000000000001',
		title: 'updated 2',
	});

	const previousWrite = driver.write;
	driver.write = () => { throw new Error('not working!'); };

	try {
		const output = await testModels(driver).item().saveFromRawContent(user, [{
			name: '00000000000000000000000000000001.md',
			body: Buffer.from(noteBodyMod2),
		}]);

		expect(output['00000000000000000000000000000001.md'].error.message).toBe('not working!');
		const itemMod2 = testModels(driver).item().itemToJoplinItem(await testModels(driver).item().loadByJopId(user.id, '00000000000000000000000000000001', { withContent: true }));
		expect(itemMod2.title).toBe('updated 1'); // Check it has not been updated
	} finally {
		driver.write = previousWrite;
	}
}

export async function shouldSupportFallbackDriver(driver: StorageDriverBase, fallbackDriver: StorageDriverBase) {
	const { user } = await createUserAndSession(1);

	const output = await testModels(driver).item().saveFromRawContent(user, [{
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

	const testModelWithFallback = models({
		storageDriver: driver,
		storageDriverFallback: fallbackDriver,
	});

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
		// Check that it has cleared the fallback driver content
		const context: Context = { models: models() };
		const fallbackContent = await fallbackDriver.read(itemId, context);
		expect(fallbackContent.byteLength).toBe(0);

		// Check that it has written to the main driver content
		const mainContent = await driver.read(itemId, context);
		expect(mainContent.byteLength).toBe(previousByteLength + 4);
	}
}

export async function shouldSupportFallbackDriverInReadWriteMode(driver: StorageDriverBase, fallbackDriver: StorageDriverBase) {
	if (fallbackDriver.mode !== StorageDriverMode.ReadWrite) throw new Error('Content driver must be configured in RW mode for this test');

	const { user } = await createUserAndSession(1);

	const testModelWithFallback = models({
		storageDriver: driver,
		storageDriverFallback: fallbackDriver,
	});

	const output = await testModelWithFallback.item().saveFromRawContent(user, [{
		name: '00000000000000000000000000000001.md',
		body: Buffer.from(makeNoteSerializedBody({
			id: '00000000000000000000000000000001',
			title: 'testing',
		})),
	}]);

	const itemId = output['00000000000000000000000000000001.md'].item.id;

	{
		// Check that it has written the content to both drivers
		const context: Context = { models: models() };
		const fallbackContent = await fallbackDriver.read(itemId, context);
		expect(fallbackContent.byteLength).toBeGreaterThan(10);

		const mainContent = await driver.read(itemId, context);
		expect(mainContent.toString()).toBe(fallbackContent.toString());
	}
}

export async function shouldUpdateContentStorageIdAfterSwitchingDriver(oldDriver: StorageDriverBase, newDriver: StorageDriverBase) {
	if (oldDriver.storageId === newDriver.storageId) throw new Error('Drivers must be different for this test');

	const { user } = await createUserAndSession(1);

	const oldDriverModel = models({
		storageDriver: oldDriver,
	});

	const newDriverModel = models({
		storageDriver: newDriver,
	});

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
}
