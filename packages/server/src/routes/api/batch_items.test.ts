import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItem } from '../../utils/testing/testUtils';
import { deleteApi, getApiC } from '../../utils/testing/apiUtils';
import { makeNoteSerializedBody } from '../../utils/testing/serializedItems';
import ItemModel from '../../models/ItemModel';

const unexpectedError = () => new Error('select * from "users" where "password" = \'secret\'');
const unexpectedErrorMessage = /^Internal server error \(error ID: [\w-]+\)$/;


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

	test('should not return the details of unexpected errors', async () => {
		const { session } = await createUserAndSession(1, true);
		const noteId = '00000000000000000000000000000001';
		await createItem(session.id, `root:/${noteId}.md:`, makeNoteSerializedBody({ id: noteId }));
		jest.spyOn(ItemModel.prototype, 'checkIfAllowed').mockRejectedValueOnce(unexpectedError());

		try {
			const response = await batchDeleteItems(session.id, [noteId, '12345678901234567890123456789012']) as { items: Record<string, { error: object }> };
			expect(response.items[`${noteId}.md`].error).toEqual({ message: expect.stringMatching(unexpectedErrorMessage) });
			expect(response.items['12345678901234567890123456789012.md'].error).toEqual({ httpCode: 404, message: 'Not found: 12345678901234567890123456789012.md' });
		} finally {
			jest.restoreAllMocks();
		}
	});

	test('should not return the message of an unexpected error thrown by a route', async () => {
		const { session } = await createUserAndSession(1, true);
		jest.spyOn(ItemModel.prototype, 'loadByName').mockRejectedValueOnce(unexpectedError());

		try {
			const context = await getApiC(session.id, 'items/root:/test.md:');
			expect(context.response.status).toBe(500);
			const body = context.response.body as { error: string; code?: string };
			expect(body.error).toMatch(unexpectedErrorMessage);
			expect(body.code).toBeUndefined();
		} finally {
			jest.restoreAllMocks();
		}
	});
});
