import { Share, ShareType, ShareUser, ShareUserStatus } from '../../services/database/types';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createItemTree, createFolder, expectHttpError } from '../../utils/testing/testUtils';
import { postApi, getApi, patchApi } from '../../utils/testing/apiUtils';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound, ErrorTooManyRequests } from '../../utils/errors';
import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
import { PaginatedResults } from '../../models/utils/pagination';
import config from '../../config';

describe('shares', () => {

	beforeAll(async () => {
		await beforeAllDb('shares');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should retrieve share info', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);

		const tree: Record<string, Record<string, null>> = {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
			'000000000000000000000000000000F2': {
				'00000000000000000000000000000002': null,
			},
		};

		const itemModel1 = models().item();

		await createItemTree(user1.id, '', tree);
		const folderItem = await itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');
		const noteItem2 = await itemModel1.loadByJopId(user1.id, '00000000000000000000000000000002');
		const { share } = await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.Folder, folderItem);

		// Only share with user 3, without accepting it
		await postApi(session1.id, `shares/${share.id}/users`, {
			email: user3.email,
		});

		await postApi<Share>(session1.id, 'shares', {
			note_id: noteItem2.jop_id,
		});

		{
			const shares = await getApi<PaginatedResults<Share>>(session1.id, 'shares');
			expect(shares.items.length).toBe(2);

			const share1: Share = shares.items.find(it => it.folder_id === '000000000000000000000000000000F1');
			expect(share1).toBeTruthy();
			expect(share1.type).toBe(ShareType.Folder);

			const share2: Share = shares.items.find(it => it.note_id === '00000000000000000000000000000002');
			expect(share2).toBeTruthy();
			expect(share2.type).toBe(ShareType.Note);

			const shareUsers = await getApi<PaginatedResults<{ user: { email: string }; status: ShareUserStatus }>>(session1.id, `shares/${share1.id}/users`);
			expect(shareUsers.items.length).toBe(2);

			const su2 = shareUsers.items.find(su => su.user.email === 'user2@localhost');
			expect(su2).toBeTruthy();
			expect(su2.status).toBe(ShareUserStatus.Accepted);

			const su3 = shareUsers.items.find(su => su.user.email === 'user3@localhost');
			expect(su3).toBeTruthy();
			expect(su3.status).toBe(ShareUserStatus.Waiting);
		}
	});

	test('should allow unauthenticated access to a published folder share', async () => {
		const { session } = await createUserAndSession(1);
		await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });

		const share = await postApi<Share>(session.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
			type: ShareType.PublishedFolder,
		});

		const result = await getApi<Share>('', `shares/${share.id}`);
		expect(result.id).toBe(share.id);
		expect(result.type).toBe(ShareType.PublishedFolder);
	});

	test('should not reveal whether an email has an account', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);
		const { user: user3 } = await createUserAndSession(3);

		await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });
		const share = await postApi<Share>(session1.id, 'shares', {
			folder_id: '000000000000000000000000000000F1',
		});

		const postRecipient = async (sessionId: string, fields: Record<string, unknown>) => {
			try {
				await postApi(sessionId, `shares/${share.id}/users`, fields);
			} catch (error) {
				// The message carries the whole response, including a stack
				// trace that refers to this test, so compare the reported
				// error only.
				return { httpCode: error.httpCode, error: JSON.parse(error.message.slice(error.message.indexOf('{'))).body.error };
			}
			throw new Error('Should have thrown');
		};

		const expectSameAnswer = async (sessionId: string, fields: Record<string, unknown>) => {
			const existing = await postRecipient(sessionId, { ...fields, email: user3.email });
			const unknown = await postRecipient(sessionId, { ...fields, email: 'does-not-exist@example.com' });
			expect(existing.httpCode).toBe(ErrorForbidden.httpCode);
			expect(unknown).toEqual(existing);
		};

		// A user who does not own the share must get the same answer whether
		// or not the address exists, otherwise the end point can be used to
		// find out which addresses are registered.
		await expectSameAnswer(session2.id, {});
	});

	test('should apply the same checks whatever the type of the status used to accept an invitation', async () => {
		const { user: user1, session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });
		const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
		const shareUser = await postApi<ShareUser>(session1.id, `shares/${share.id}/users`, { email: user2.email });

		await expectHttpError(async () => patchApi(session2.id, `share_users/${shareUser.id}`, { status: 'accepted' }), ErrorBadRequest.httpCode);

		// An invitation from an account that has since been disabled cannot be accepted, including with a string status
		await models().user().save({ id: user1.id, enabled: 0 });
		await expectHttpError(async () => patchApi(session2.id, `share_users/${shareUser.id}`, { status: '1' }), ErrorForbidden.httpCode);
		expect((await models().shareUser().load(shareUser.id)).status).toBe(ShareUserStatus.Waiting);
	});

	test('should require a confirmed email to invite someone or to accept an invitation', async () => {
		// Only when emails are sent, as the address can be confirmed only then
		const mailerEnabled = config().mailer.enabled;
		config().mailer.enabled = true;

		try {
			const { user: user1, session: session1 } = await createUserAndSession(1);
			const { user: user2, session: session2 } = await createUserAndSession(2);

			await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });
			const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });

			await models().user().save({ id: user1.id, email_confirmed: 0 });
			await expectHttpError(async () => postApi(session1.id, `shares/${share.id}/users`, { email: user2.email }), ErrorForbidden.httpCode);

			await models().user().save({ id: user1.id, email_confirmed: 1 });
			const shareUser = await postApi<ShareUser>(session1.id, `shares/${share.id}/users`, { email: user2.email });

			await models().user().save({ id: user2.id, email_confirmed: 0 });
			await expectHttpError(async () => patchApi(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted }), ErrorForbidden.httpCode);

			await models().user().save({ id: user2.id, email_confirmed: 1 });
			await patchApi(session2.id, `share_users/${shareUser.id}`, { status: ShareUserStatus.Accepted });
			expect((await models().shareUser().load(shareUser.id)).status).toBe(ShareUserStatus.Accepted);
		} finally {
			config().mailer.enabled = mailerEnabled;
		}
	});

	test('should not require a confirmed email when no email can be sent', async () => {
		const mailerEnabled = config().mailer.enabled;
		config().mailer.enabled = false;

		try {
			const { user: user1, session: session1 } = await createUserAndSession(1);
			const { user: user2 } = await createUserAndSession(2);
			await models().user().save({ id: user1.id, email_confirmed: 0 });

			await createFolder(session1.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });
			const share = await postApi<Share>(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });

			expect(await postApi<ShareUser>(session1.id, `shares/${share.id}/users`, { email: user2.email })).toBeTruthy();
		} finally {
			config().mailer.enabled = mailerEnabled;
		}
	});

	test('should limit the number of invitations an account can send', async () => {
		process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS = '1';

		try {
			const { session } = await createUserAndSession(1);

			await createFolder(session.id, { id: '000000000000000000000000000000F1', title: 'My Folder' });
			const share = await postApi<Share>(session.id, 'shares', {
				folder_id: '000000000000000000000000000000F1',
			});

			for (let i = 0; i < 50; i++) {
				await expectHttpError(async () => postApi(session.id, `shares/${share.id}/users`, { email: `unknown-${i}@example.com` }), ErrorNotFound.httpCode);
			}

			await expectHttpError(async () => postApi(session.id, `shares/${share.id}/users`, { email: 'unknown-50@example.com' }), ErrorTooManyRequests.httpCode);
		} finally {
			delete process.env.JOPLIN_TEST_ACCOUNT_ACTION_LIMITERS;
		}
	});

	test.each([
		['note', { note_id: '00000000000000000000000000000001' }],
		['notebook', { folder_id: '000000000000000000000000000000F1', type: ShareType.PublishedFolder }],
	])('should email the owner when an encrypted %s is published', async (itemType, input) => {
		const { session, user } = await createUserAndSession(1);

		await createItemTree(user.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
				'00000000000000000000000000000002': null,
			},
		});

		const publishedEmails = async () => (await models().email().all()).filter(e => e.subject.includes('was published'));

		const unencryptedShare = await postApi<Share>(session.id, 'shares', input);
		expect(await publishedEmails()).toHaveLength(0);
		await models().share().delete(unencryptedShare.id);

		for (const jopId of ['000000000000000000000000000000F1', '00000000000000000000000000000001', '00000000000000000000000000000002']) {
			const item = await models().item().loadByJopId(user.id, jopId);
			await models().item().saveForUser(user.id, { id: item.id, jop_encryption_applied: 1 });
		}

		// Within the same minute, as when several selected notes are published at once
		const dateNow = jest.spyOn(Date, 'now').mockReturnValue(Date.now());
		let share: Share;
		try {
			share = await postApi<Share>(session.id, 'shares', input);
			await postApi<Share>(session.id, 'shares', input);
			await postApi<Share>(session.id, 'shares', { note_id: '00000000000000000000000000000002' });
		} finally {
			dateNow.mockRestore();
		}

		const emails = await publishedEmails();
		expect(emails.length).toBe(1);
		expect(emails[0].recipient_id).toBe(user.id);
		expect(emails[0].body).toContain(`A ${itemType} was published`);
		expect(emails[0].body).toContain(share.id);
	});

	test('should not add recipients to a note share', async () => {
		const { session, user } = await createUserAndSession(1);
		const { user: user2 } = await createUserAndSession(2);

		await createItemTree(user.id, '', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		const share = await postApi<Share>(session.id, 'shares', {
			note_id: '00000000000000000000000000000001',
		});

		// Only a shared notebook can have recipients - the apps never add them
		// to a note or published folder share.
		await expectHttpError(async () => postApi(session.id, `shares/${share.id}/users`, {
			email: user2.email,
		}), ErrorBadRequest.httpCode);

		expect((await models().shareUser().byShareId(share.id, null)).length).toBe(0);
	});

});
