import { ChangeType, Share, ShareType, ShareUser } from '../../db';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, checkThrowAsync, createNote, createFolder, updateItem, createItemTree, makeNoteSerializedBody, createItem, expectHttpError, createResource, createItemTree2 } from '../../utils/testing/testUtils';
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

		const resourceItem1 = await createResource(session1.id, {
			id: '000000000000000000000000000000E1',
			size: 8,
		}, 'testing1');

		const resourceItem2 = await createResource(session1.id, {
			id: '000000000000000000000000000000E2',
			size: 8,
		}, 'testing2');

		const tree:any[] = [
			{
				id: '000000000000000000000000000000F1',
				children: [
					{
						id: '00000000000000000000000000000001',
						title: 'note test',
						body: '[testing](:/' + resourceItem1.id + ') [testing](:/' + resourceItem2.id + ')',
					},
				],
			},
		];

		await createItemTree2(user1.id, '', tree);

		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

		// const childrenBefore = await getApi<PaginatedItems>(session2.id, 'items/root/children');
		// expect(childrenBefore.items.length).toBe(0);

		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		const children = await getApi<PaginatedItems>(session2.id, 'items/root/children');

		console.info(children);
	});
	
});
