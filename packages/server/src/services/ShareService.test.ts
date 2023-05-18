import config from '../config';
import { shareFolderWithUser } from '../utils/testing/shareApiUtils';
import { createUserAndSession, beforeAllDb, afterAllTests, beforeEachDb, models, updateNote, msleep } from '../utils/testing/testUtils';
import { Env } from '../utils/types';
import ShareService from './ShareService';

describe('ShareService', () => {

	beforeAll(async () => {
		await beforeAllDb('ShareService');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should run maintenance when an item is changed', async () => {
		jest.useFakeTimers();

		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const service = new ShareService(Env.Dev, models(), config());
		void service.runInBackground();

		await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F2', {
			'000000000000000000000000000000F1': {},
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000001': null,
			},
		});

		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F2');
		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');
		// await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

		// Modify the note parent, which should trigger a maintenance in x
		// seconds.
		const note = await models().item().loadAsJoplinItem(noteItem.id);
		await updateNote(session1.id, { ...note, parent_id: '000000000000000000000000000000F1', share_id: '' });

		// Force the maintenance to run now
		jest.runOnlyPendingTimers();
		jest.useRealTimers();

		// We need to wait here for it to finish running before we can check the
		// condition. We need to use real timers for this.
		while (service.maintenanceInProgress) {
			await msleep(10);
		}

		// Since the note has been moved to a different folder, the maintenance
		// task should have updated the shared items and removed note 1 from user
		// 2's children.
		const children = await models().item().children(user2.id);
		expect(children.items.length).toBe(1);
		expect(children.items[0].id).toBe(folderItem.id);

		await service.destroy();
	});

});
