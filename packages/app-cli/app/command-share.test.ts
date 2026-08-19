import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import mockShareService, { ApiMock } from '@joplin/lib/testing/share/mockShareService';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Folder from '@joplin/lib/models/Folder';
import ShareService from '@joplin/lib/services/share/ShareService';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import { ShareInvitation, ShareUserStatus, StateShare } from '@joplin/lib/services/share/reducer';
import app from './app';
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

const mockShareServiceForFolderSharing = (eventHandlerOverrides: Partial<ApiMock>&{ onExec?: undefined }) => {
	const invitations: ShareInvitation[] = [];

	mockShareService({
		getShareInvitations: async () => ({
			items: invitations,
		}),
		getShares: async () => ({ items: [defaultFolderShare] }),
		getShareUsers: async (_id: string) => ({ items: [] }),
		postShareUsers: async (_id, _body) => { },
		postShares: async () => ({ id: shareId }),
		...eventHandlerOverrides,
	}, ShareService.instance(), app().store());

	return {
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
	});

	test('should allow adding a user to a share', async () => {
		const folder = await Folder.save({ title: 'folder1' });

		let lastShareUserUpdate: unknown|null = null;
		mockShareServiceForFolderSharing({
			getShares: async () => {
				const isShared = !!lastShareUserUpdate;
				if (isShared) {
					return {
						items: [{ ...defaultFolderShare, folder_id: folder.id }],
					};
				} else {
					return { items: [] };
				}
			},
			// Called when a new user is added to a share
			postShareUsers: async (_id, body) => {
				lastShareUserUpdate = body;
			},
		});

		const { command } = setUpCommand();

		// Should share read-write by default
		await command.action({
			'command': 'add',
			'notebook': 'folder1',
			'user': 'test@localhost',
			options: {},
		});
		expect(lastShareUserUpdate).toMatchObject({
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
		expect(lastShareUserUpdate).toMatchObject({
			email: 'test2@localhost',
			can_write: 0,
			can_read: 1,
		});
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
		const mock = mockShareServiceForFolderSharing({});
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

