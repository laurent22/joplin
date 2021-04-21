import { ChangeType, Share, ShareType, ShareUser } from '../../db';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, checkThrowAsync, createNote, createFolder, updateItem, createItemTree, makeNoteSerializedBody, createItem, expectHttpError, createResource, createItemTree2, updateNote } from '../../utils/testing/testUtils';
import { postApi, patchApi, getApi } from '../../utils/testing/apiUtils';
import { PaginatedChanges } from '../../models/ChangeModel';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { msleep } from '../../utils/time';
import { ErrorBadRequest, ErrorForbidden } from '../../utils/errors';
import { serializeJoplinItem, unserializeJoplinItem } from '../../apps/joplin/joplinUtils';
import { PaginatedItems } from '../../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';

describe('shares.resource', function() {

	beforeAll(async () => {
		await beforeAllDb('shares.resource');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should share resources inside a shared folder', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
		const resourceItem2 = await createResource(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');

		await createItemTree2(user1.id, '', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'note test',
						body: '[testing](:/' + resourceItem1.jop_id + ') [testing](:/' + resourceItem2.jop_id + ')',
					},
				],
			},
		]);

		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		const children = await getApi<PaginatedItems>(session2.id, 'items/root/children');

		expect(children.items.length).toBe(6);
		expect(!!children.items.find(i => i.name === '000000000000000000000000000000E1.md')).toBe(true);
		expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E1')).toBe(true);
		expect(!!children.items.find(i => i.name === '000000000000000000000000000000E2.md')).toBe(true);
		expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E2')).toBe(true);
	});

	test('should update resources share status', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
		const resourceItem2 = await createResource(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');

		await createItemTree2(user1.id, '', [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'note test',
						body: '[testing](:/' + resourceItem1.jop_id + ') [testing](:/' + resourceItem2.jop_id + ')',
					},
				],
			},
			{
				id: '000000000000000000000000000000F2',
				children: [],
			},
		]);

		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		// Note is moved to another folder, outside of shared folder

		{
			const note = await models().item().loadAsJoplinItem(noteItem.id);
			
			await updateNote(session1.id, { ...note, parent_id: '000000000000000000000000000000F2' });

			await models().share().updateSharedItems();

			const newChildren = await models().item().children(user2.id);
			console.info(newChildren);

			console.info(await models().item().allForDebug());
			// expect(newChildren.items.length).toBe(3);
			// expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
		}
	});
	
});
