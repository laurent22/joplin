import { Item } from '../../services/database/types';
import { createUserAndSession, makeNoteSerializedBody, models } from '../../utils/testing/testUtils';
import ContentDriverBase from './ContentDriverBase';

const testModels = (driver: ContentDriverBase) => {
	return models({ contentDriver: driver });
};

export async function shouldWriteToContentAndReadItBack(driver: ContentDriverBase) {
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

	const rawContent = await driver.read(item.id, { models: models() });
	expect(rawContent.byteLength).toBe(item.content_size);

	const jopItem = testModels(driver).item().itemToJoplinItem(item);
	expect(jopItem.id).toBe('00000000000000000000000000000001');
	expect(jopItem.title).toBe('testing driver');
}

export async function shouldDeleteContent(driver: ContentDriverBase) {
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

export async function shouldNotCreateItemIfContentNotSaved(driver: ContentDriverBase) {
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

export async function shouldNotUpdateItemIfContentNotSaved(driver: ContentDriverBase) {
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
