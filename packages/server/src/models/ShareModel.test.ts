import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, checkThrowAsync, createItem, createItemTree } from '../utils/testing/testUtils';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import { ShareType } from '../db';
import { shareWithUserAndAccept } from '../utils/testing/shareApiUtils';

describe('ShareModel', function() {

	beforeAll(async () => {
		await beforeAllDb('ShareModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should validate share objects', async function() {
		const { user, session } = await createUserAndSession(1, true);

		const item = await createItem(session.id, 'root:/test.txt:', 'testing');

		let error = null;

		error = await checkThrowAsync(async () => await models().share().createShare(user.id, 20 as ShareType, item.id));
		expect(error instanceof ErrorBadRequest).toBe(true);

		error = await checkThrowAsync(async () => await models().share().createShare(user.id, ShareType.Link, 'doesntexist'));
		expect(error instanceof ErrorNotFound).toBe(true);
	});

	test('should get all shares of a user', async function() {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3, session: session3 } = await createUserAndSession(3);

		await createItemTree(user1.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await createItemTree(user2.id, '', {
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000002': null,
			},
		});

		const folderItem1 = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
		await shareWithUserAndAccept(session1.id, session3.id, user3, ShareType.JoplinRootFolder, folderItem1);

		const folderItem2 = await models().item().loadByJopId(user2.id, '000000000000000000000000000000F2');
		await shareWithUserAndAccept(session2.id, session1.id, user1, ShareType.JoplinRootFolder, folderItem2);

		const shares1 = await models().share().byUserId(user1.id, ShareType.JoplinRootFolder);
		const shares2 = await models().share().byUserId(user2.id, ShareType.JoplinRootFolder);
		const shares3 = await models().share().byUserId(user3.id, ShareType.JoplinRootFolder);

		expect(shares1.length).toBe(2);
		expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();
		expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();

		expect(shares2.length).toBe(1);
		expect(shares2.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();

		expect(shares3.length).toBe(1);
		expect(shares3.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();
	});

});
