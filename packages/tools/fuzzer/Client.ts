import uuid, { createSecureRandom } from '@joplin/lib/uuid';
import { ActionableClient, FolderMetadata, FuzzContext, HttpMethod, ItemId, Json, NoteData, RandomFolderOptions, UserData } from './types';
import { join } from 'path';
import { mkdir } from 'fs-extra';
import getStringProperty from './utils/getStringProperty';
import { strict as assert } from 'assert';
import ClipperServer from '@joplin/lib/ClipperServer';
import ActionTracker from './ActionTracker';
import Logger from '@joplin/utils/Logger';
import execa = require('execa');
import { cliDirectory } from './constants';
import { commandToString } from '@joplin/utils';
import { quotePath } from '@joplin/utils/path';
import getNumberProperty from './utils/getNumberProperty';
import retryWithCount from './utils/retryWithCount';

const logger = Logger.create('Client');


class Client implements ActionableClient {
	public readonly email: string;

	public static async create(actionTracker: ActionTracker, context: FuzzContext) {
		const id = uuid.create();
		const profileDirectory = join(context.baseDir, id);
		await mkdir(profileDirectory);

		const email = `${id}@localhost`;
		const password = createSecureRandom();
		const apiOutput = await context.execApi('POST', 'api/users', {
			email,
		});
		const serverId = getStringProperty(apiOutput, 'id');

		// The password needs to be set *after* creating the user.
		const userRoute = `api/users/${encodeURIComponent(serverId)}`;
		await context.execApi('PATCH', userRoute, {
			email,
			password,
			email_confirmed: 1,
		});

		const closeAccount = async () => {
			await context.execApi('DELETE', userRoute, {});
		};

		try {
			const userData = {
				email: getStringProperty(apiOutput, 'email'),
				password,
			};

			assert.equal(email, userData.email);

			const apiToken = createSecureRandom().replace(/[-]/g, '_');
			const apiPort = await ClipperServer.instance().findAvailablePort();

			const client = new Client(
				actionTracker.track({ email }),
				userData,
				profileDirectory,
				apiPort,
				apiToken,
				closeAccount,
			);

			// Joplin Server sync
			await client.execCliCommand_('config', 'sync.target', '9');
			await client.execCliCommand_('config', 'sync.9.path', context.serverUrl);
			await client.execCliCommand_('config', 'sync.9.username', userData.email);
			await client.execCliCommand_('config', 'sync.9.password', userData.password);
			await client.execCliCommand_('config', 'api.token', apiToken);
			await client.execCliCommand_('config', 'api.port', String(apiPort));

			const e2eePassword = createSecureRandom().replace(/^-/, '_');
			await client.execCliCommand_('e2ee', 'enable', '--password', e2eePassword);
			logger.info('Created and configured client');

			// Run asynchronously -- the API server command doesn't exit until the server
			// is closed.
			void (async () => {
				try {
					await client.execCliCommand_('server', 'start');
				} catch (error) {
					logger.info('API server exited');
					logger.debug('API server exit status', error);
				}
			})();

			await client.sync();
			return client;
		} catch (error) {
			await closeAccount();
			throw error;
		}
	}

	private constructor(
		private readonly tracker_: ActionableClient,
		userData: UserData,
		private readonly profileDirectory: string,
		private readonly apiPort_: number,
		private readonly apiToken_: string,
		private readonly cleanUp_: ()=> Promise<void>,
	) {
		this.email = userData.email;
	}

	public async close() {
		await this.execCliCommand_('server', 'stop');
		await this.cleanUp_();
	}

	private get cliCommandArguments() {
		return [
			'start-no-build',
			'--profile', this.profileDirectory,
			'--env', 'dev',
		];
	}

	public getHelpText() {
		return [
			`Client ${this.email}:`,
			`\tCommand: cd ${quotePath(cliDirectory)} && ${commandToString('yarn', this.cliCommandArguments)}`,
		].join('\n');
	}

	private async execCliCommand_(commandName: string, ...args: string[]) {
		assert.match(commandName, /^[a-z]/, 'Command name must start with a lowercase letter.');
		const commandResult = await execa('yarn', [
			...this.cliCommandArguments,
			commandName,
			...args,
		], {
			cwd: cliDirectory,
			// Connects /dev/null to stdin
			stdin: 'ignore',
		});
		logger.debug('Ran command: ', commandResult.command, commandResult.exitCode);
		logger.debug('     Output: ', commandResult.stdout);
		return commandResult;
	}

	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: 'GET', route: string): Promise<Json>;
	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: 'POST'|'PUT', route: string, data: Json): Promise<Json>;
	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: HttpMethod, route: string, data: Json|null = null): Promise<Json> {
		route = route.replace(/^[/]/, '');
		const url = new URL(`http://localhost:${this.apiPort_}/${route}`);
		url.searchParams.append('token', this.apiToken_);

		const response = await fetch(url, {
			method,
			body: data ? JSON.stringify(data) : undefined,
		});

		if (!response.ok) {
			throw new Error(`Request to ${route} failed with error: ${await response.text()}`);
		}

		return await response.json();
	}

	private async execPagedApiCommand_<Result>(
		method: 'GET',
		route: string,
		params: Record<string, string>,
		deserializeItem: (data: Json)=> Result,
	): Promise<Result[]> {
		const searchParams = new URLSearchParams(params);

		const results: Result[] = [];
		let hasMore = true;
		for (let page = 1; hasMore; page++) {
			searchParams.set('page', String(page));
			searchParams.set('limit', '10');
			const response = await this.execApiCommand_(
				method, `${route}?${searchParams}`,
			);
			if (
				typeof response !== 'object'
				|| !('has_more' in response)
				|| !('items' in response)
				|| !Array.isArray(response.items)
			) {
				throw new Error(`Invalid response: ${JSON.stringify(response)}`);
			}
			hasMore = !!response.has_more;

			for (const item of response.items) {
				results.push(deserializeItem(item));
			}
		}

		return results;
	}

	private async decrypt_() {
		// E2EE decryption can occasionally fail with "Master key is not loaded:".
		// Allow e2ee decryption to be retried:
		await retryWithCount(async () => {
			const result = await this.execCliCommand_('e2ee', 'decrypt', '--force');
			if (!result.stdout.includes('Completed decryption.')) {
				throw new Error(`Decryption did not complete: ${result.stdout}`);
			}
		}, {
			count: 3,
			onFail: async (error)=>{
				logger.warn('E2EE decryption failed:', error);
				logger.info('Syncing before retry...');
				await this.execCliCommand_('sync');
			},
		});
	}

	public async sync() {
		logger.info('Sync', this.email);

		await this.tracker_.sync();

		const result = await this.execCliCommand_('sync');
		if (result.stdout.match(/Last error:/i)) {
			throw new Error(`Sync failed: ${result.stdout}`);
		}

		await this.decrypt_();
	}

	public async createFolder(folder: FolderMetadata) {
		logger.info('Create folder', folder.id, 'in', `${folder.parentId ?? 'root'}/${this.email}`);
		await this.tracker_.createFolder(folder);

		await this.execApiCommand_('POST', '/folders', {
			id: folder.id,
			title: folder.title,
			parent_id: folder.parentId ?? '',
		});
	}

	private async assertNoteMatchesState_(expected: NoteData) {
		assert.equal(
			(await this.execCliCommand_('cat', expected.id)).stdout,
			`${expected.title}\n\n${expected.body}`,
			'note should exist',
		);
	}

	public async createNote(note: NoteData) {
		logger.info('Create note', note.id, 'in', `${note.parentId}/${this.email}`);
		await this.tracker_.createNote(note);

		await this.execApiCommand_('POST', '/notes', {
			id: note.id,
			title: note.title,
			body: note.body,
			parent_id: note.parentId ?? '',
		});
		await this.assertNoteMatchesState_(note);
	}

	public async updateNote(note: NoteData) {
		logger.info('Update note', note.id, 'in', `${note.parentId}/${this.email}`);
		await this.tracker_.updateNote(note);
		await this.execApiCommand_('PUT', `/notes/${encodeURIComponent(note.id)}`, {
			title: note.title,
			body: note.body,
			parent_id: note.parentId ?? '',
		});
		await this.assertNoteMatchesState_(note);
	}

	public async deleteFolder(id: string) {
		logger.info('Delete folder', id, 'in', this.email);
		await this.tracker_.deleteFolder(id);

		await this.execCliCommand_('rmbook', '--permanent', '--force', id);
	}

	public async shareFolder(id: string, shareWith: Client) {
		await this.tracker_.shareFolder(id, shareWith);

		logger.info('Share', id, 'with', shareWith.email);
		await this.execCliCommand_('share', 'add', id, shareWith.email);
		await this.sync();
		await shareWith.sync();

		const shareWithIncoming = JSON.parse((await shareWith.execCliCommand_('share', 'list', '--json')).stdout);
		const pendingInvitations = shareWithIncoming.invitations.filter((invitation: unknown) => {
			if (typeof invitation !== 'object' || !('accepted' in invitation)) {
				throw new Error('Invalid invitation format');
			}
			return !invitation.accepted;
		});
		assert.deepEqual(pendingInvitations, [
			{
				accepted: false,
				waiting: true,
				rejected: false,
				folderId: id,
				fromUser: {
					email: this.email,
				},
			},
		], 'there should be a single incoming share from the expected user');

		await shareWith.execCliCommand_('share', 'accept', id);
	}

	public async moveItem(itemId: ItemId, newParentId: ItemId) {
		logger.info('Move', itemId, 'to', newParentId);
		await this.tracker_.moveItem(itemId, newParentId);
		const movingToRoot = !newParentId;
		await this.execCliCommand_('mv', itemId, movingToRoot ? 'root' : newParentId);
	}

	public async listNotes() {
		const params = {
			fields: 'id,parent_id,body,title,is_conflict,conflict_original_id',
			include_deleted: '1',
			include_conflicts: '1',
		};
		return await this.execPagedApiCommand_(
			'GET',
			'/notes',
			params,
			item => ({
				id: getStringProperty(item, 'id'),
				parentId: getNumberProperty(item, 'is_conflict') === 1 ? (
					`[conflicts for ${getStringProperty(item, 'conflict_original_id')} in ${this.email}]`
				) : getStringProperty(item, 'parent_id'),
				title: getStringProperty(item, 'title'),
				body: getStringProperty(item, 'body'),
			}),
		);
	}

	public async listFolders() {
		const params = {
			fields: 'id,parent_id,title',
			include_deleted: '1',
		};
		return await this.execPagedApiCommand_(
			'GET',
			'/folders',
			params,
			item => ({
				id: getStringProperty(item, 'id'),
				parentId: getStringProperty(item, 'parent_id'),
				title: getStringProperty(item, 'title'),
			}),
		);
	}

	public async randomFolder(options: RandomFolderOptions) {
		return this.tracker_.randomFolder(options);
	}

	public async allFolderDescendants(parentId: ItemId) {
		return this.tracker_.allFolderDescendants(parentId);
	}

	public async randomNote() {
		return this.tracker_.randomNote();
	}

	public async checkState(_allClients: Client[]) {
		logger.info('Check state', this.email);

		type ItemSlice = { id: string };
		const compare = (a: ItemSlice, b: ItemSlice) => {
			if (a.id === b.id) return 0;
			return a.id < b.id ? -1 : 1;
		};

		const assertNoAdjacentEqualIds = (sortedById: ItemSlice[], assertionLabel: string) => {
			for (let i = 1; i < sortedById.length; i++) {
				const current = sortedById[i];
				const previous = sortedById[i - 1];
				assert.notEqual(
					current.id,
					previous.id,
					`[${assertionLabel}] item ${i} should have a different ID from item ${i - 1}`,
				);
			}
		};

		const checkNoteState = async () => {
			const notes = [...await this.listNotes()];
			const expectedNotes = [...await this.tracker_.listNotes()];

			notes.sort(compare);
			expectedNotes.sort(compare);

			assertNoAdjacentEqualIds(notes, 'notes');
			assertNoAdjacentEqualIds(expectedNotes, 'expectedNotes');
			assert.deepEqual(notes, expectedNotes, 'should have the same notes as the expected state');
		};

		const checkFolderState = async () => {
			const folders = [...await this.listFolders()];
			const expectedFolders = [...await this.tracker_.listFolders()];

			folders.sort(compare);
			expectedFolders.sort(compare);

			assertNoAdjacentEqualIds(folders, 'folders');
			assertNoAdjacentEqualIds(expectedFolders, 'expectedFolders');
			assert.deepEqual(folders, expectedFolders, 'should have the same folders as the expected state');
		};

		await checkNoteState();
		await checkFolderState();
	}
}

export default Client;

