import { encryptionService, expectNotThrow, expectThrow, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import mockShareService, { ApiMock } from '@joplin/lib/testing/share/mockShareService';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Folder from '@joplin/lib/models/Folder';
import ShareService from '@joplin/lib/services/share/ShareService';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import { ShareInvitation, ShareUserStatus, StateShare } from '@joplin/lib/services/share/reducer';
import app from './app';
import { formatPublicKeyFingerprint, generateKeyPair, ppkPublicKeyFingerprint } from '@joplin/lib/services/e2ee/ppk/ppk';
import { loadMasterKeysFromSettings, setupAndEnableEncryption } from '@joplin/lib/services/e2ee/utils';
import { reg } from '@joplin/lib/registry';
import { FolderEntity } from '@joplin/lib/services/database/types';
const Command = require('./command-share');

const setUpCommand = () => {
	const output: string[] = [];
	const stdout = (content: string) => {
		output.push(...content.split('\n'));
	};

	const command = setupCommandForTesting(Command, stdout);
	return { command, output };
};

const shareId = 'test-id';
const defaultFolderShare: StateShare = {
	id: shareId,
	type: ModelType.Folder,
	folder_id: 'some-folder-id-here',
	note_id: undefined,
	master_key_id: undefined,
	user: {
		full_name: 'Test user',
		email: 'test@localhost',
		id: 'some-user-id',
	},
};

const mockShareServiceForFolderSharing = (folder: FolderEntity, eventHandlerOverrides: Partial<ApiMock>&{ onExec?: undefined }) => {
	const invitations: ShareInvitation[] = [];

	let isShared = false;
	let lastShareUserUpdate: unknown|null = null;
	const folderShareInfo = async () => {
		const reloadedFolder = await Folder.load(folder.id);
		return { ...defaultFolderShare, folder_id: folder.id, master_key_id: reloadedFolder.master_key_id };
	};

	mockShareService({
		getShareInvitations: async () => ({
			items: invitations,
		}),
		getShares: async () => {
			if (isShared) {
				return {
					items: [await folderShareInfo()],
				};
			} else {
				return { items: [] };
			}
		},

		getShareUsers: async (_id: string) => ({ items: [] }),

		// Called when creating a share
		postShares: async () => {
			isShared = true;
			return await folderShareInfo();
		},
		// Called when a new user is added to a share
		postShareUsers: async (_id, body) => {
			lastShareUserUpdate = body;
		},

		...eventHandlerOverrides,
	}, ShareService.instance(), app().store());

	return {
		lastShareUserUpdate: () => lastShareUserUpdate,
		addInvitation: (invitation: Partial<ShareInvitation>) => {
			const defaultInvitation: ShareInvitation = {
				share: defaultFolderShare,
				id: 'some-invitation-id',
				master_key: undefined,
				status: ShareUserStatus.Waiting,
				can_read: 1,
				can_write: 1,
			};

			invitations.push({ ...defaultInvitation, ...invitation });
		},
	};
};


describe('command-share', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
		BaseItem.shareService_ = ShareService.instance();
		// Mock scheduleSync to avoid warnings related to background sync running outside of tests
		reg.scheduleSync = jest.fn();
	});

	test('should allow adding a user to a share', async () => {
		const folder = await Folder.save({ title: 'folder1' });

		const { lastShareUserUpdate } = mockShareServiceForFolderSharing(folder, {});

		const { command } = setUpCommand();

		// Should share read-write by default
		await command.action({
			'command': 'add',
			'notebook': 'folder1',
			'user': 'test@localhost',
			options: {},
		});
		expect(lastShareUserUpdate()).toMatchObject({
			email: 'test@localhost',
			can_write: 1,
			can_read: 1,
		});

		// Should also support sharing as read only
		await command.action({
			'command': 'add',
			'notebook': 'folder1',
			'user': 'test2@localhost',
			options: {
				'read-only': true,
			},
		});
		expect(lastShareUserUpdate()).toMatchObject({
			email: 'test2@localhost',
			can_write: 0,
			can_read: 1,
		});
	});

	it('should validate a provided public key fingerprint when adding a user to a share', async () => {
		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '111111');
		await loadMasterKeysFromSettings(encryptionService());
		await synchronizerStart();

		const recipientPpk = await generateKeyPair(encryptionService(), '12345');

		const folder = await Folder.save({ title: 'folder1' });
		mockShareServiceForFolderSharing(folder, {
			getPublicKey: async (email) => {
				if (email === 'test@localhost') {
					return { ...recipientPpk, privateKey: undefined };
				}
				return null;
			},
		});

		const { command } = setUpCommand();

		const fingerprint = formatPublicKeyFingerprint(await ppkPublicKeyFingerprint(recipientPpk));
		await expectThrow(async () => {
			await command.action({
				'command': 'add',
				'notebook': 'folder1',
				'user': 'test@localhost',
				options: {
					'public-key-fingerprint': 'invalid',
				},
			});
		}, undefined, `Public key fingerprint mismatch. Was "${fingerprint}" but expected "invalid".`);

		const ungroupedFingerprint = fingerprint.replace(/ /g, '').toUpperCase();
		for (const expectedFingerprint of [fingerprint, ungroupedFingerprint]) {
			await expectNotThrow(async () => {
				await command.action({
					'command': 'add',
					'notebook': 'folder1',
					'user': 'test@localhost',
					options: {
						'public-key-fingerprint': expectedFingerprint,
					},
				});
			});
		}
	});

	test.each([
		{
			label: 'should list a single pending invitation',
			invitations: [{ id: 'test', status: ShareUserStatus.Waiting }],
			expectedOutput: [
				'Incoming shares:',
				'\tWaiting: Notebook some-folder-id-here from test@localhost',
				'All shared folders:',
				'\tNone',
			].join('\n'),
		},
		{
			label: 'should list accepted invitations for non-existent folders with [None] as the folder title',
			invitations: [
				{ id: 'test2', status: ShareUserStatus.Accepted },
			],
			expectedOutput: [
				'Incoming shares:',
				'\tAccepted: Notebook [None] from test@localhost',
				'All shared folders:',
				'\tNone',
			].join('\n'),
		},
		{
			label: 'should not list rejected shares',
			invitations: [
				{ id: 'test3', status: ShareUserStatus.Rejected },
			],
			expectedOutput: [
				'Incoming shares:',
				'\tNone',
				'All shared folders:',
				'\tNone',
			].join('\n'),
		},
	])('share invitations: $label', async ({ invitations, expectedOutput }) => {
		const folder = await Folder.save({ title: 'test' });
		const mock = mockShareServiceForFolderSharing(folder, {});
		for (const invitation of invitations) {
			mock.addInvitation(invitation);
		}

		await ShareService.instance().refreshShareInvitations();

		const { command, output } = setUpCommand();
		await command.action({
			'command': 'list',
			options: {},
		});

		expect(output.join('\n')).toBe(expectedOutput);
	});
});

