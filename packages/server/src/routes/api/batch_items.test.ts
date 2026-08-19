import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItem } from '../../utils/testing/testUtils';
import { deleteApi } from '../../utils/testing/apiUtils';
import { makeNoteSerializedBody } from '../../utils/testing/serializedItems';


const batchDeleteItems = (sessionId: string, jopId: string[]) => {
	const body = {
		items: jopId.map(id => `${id}.md`),
	};
	return deleteApi(sessionId, 'batch_items', { body });
};

describe('api/batch_items', () => {

	beforeAll(async () => {
		await beforeAllDb('api/batch_items');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should delete several items', async () => {
		const { user, session } = await createUserAndSession(1, true);

		const jopIds = [];
		for (let i = 0; i < 5; i++) {
			const noteId = `0000000000000000000000000000000${i}`;
			jopIds.push(noteId);
			const noteTitle = 'Title';
			const noteBody = 'Body';
			const filename = `${noteId}.md`;
			await createItem(session.id, `root:/${filename}:`, makeNoteSerializedBody({
				id: noteId,
				title: noteTitle,
				body: noteBody,
			}));
		}

		const response = await batchDeleteItems(session.id, jopIds);
		expect(response).toEqual({
			items: Object.fromEntries(jopIds.map(id => ([`${id}.md`, {}]))),
			has_more: false,
		});

		expect(await models().item().loadByJopIds(user.id, jopIds)).toEqual([]);
	});

	test('should return an error when an item to be deleted could not be found', async () => {
		const { session } = await createUserAndSession(1, true);

		const response = await batchDeleteItems(session.id, ['12345678901234567890123456789012']);
		expect(response).toMatchObject({
			has_more: false,
			items: {
				'12345678901234567890123456789012.md': {
					error: { httpCode: 404 },
				},
			},
		});
	});
});
