import uuid, { createSecureRandom } from '@joplin/lib/uuid';
import { ActionableClient, FolderData, FuzzContext, HttpMethod, ItemId, Json, NoteData, RandomFolderOptions, RandomNoteOptions, ShareOptions } from './types';
import { join } from 'path';
import { mkdir, remove } from 'fs-extra';
import getStringProperty from './utils/getStringProperty';
import { strict as assert } from 'assert';
import ClipperServer from '@joplin/lib/ClipperServer';
import ActionTracker from './ActionTracker';
import Logger from '@joplin/utils/Logger';
import { cliDirectory } from './constants';
import { commandToString } from '@joplin/utils';
import { quotePath } from '@joplin/utils/path';
import getNumberProperty from './utils/getNumberProperty';
import retryWithCount from './utils/retryWithCount';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import { msleep, Second } from '@joplin/utils/time';
import shim from '@joplin/lib/shim';
import { spawn } from 'child_process';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import { createInterface } from 'readline/promises';
import Stream = require('stream');

const logger = Logger.create('Client');

type AccountData = Readonly<{
	email: string;
	password: string;
	serverId: string;
	e2eePassword: string;
	associatedClientCount: number;
	onClientConnected: ()=> void;
	onClientDisconnected: ()=> Promise<void>;
}>;

const createNewAccount = async (email: string, context: FuzzContext): Promise<AccountData> => {
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

	let referenceCounter = 0;
	return {
		email,
		password,
		e2eePassword: createSecureRandom().replace(/^-/, '_'),
		serverId,
		get associatedClientCount() {
			return referenceCounter;
		},
		onClientConnected: () => {
			referenceCounter++;
		},
		onClientDisconnected: async () => {
			referenceCounter --;
			assert.ok(referenceCounter >= 0, 'reference counter should be non-negative');
			if (referenceCounter === 0) {
				await closeAccount();
			}
		},
	};
};

type ApiData = Readonly<{
	port: number;
	token: string;
}>;

type OnCloseListener = ()=> void;

type ChildProcessWrapper = {
	stdout: Stream.Readable;
	stderr: Stream.Readable;
	writeStdin: (data: Buffer|string)=> void;
	close: ()=> void;
};

// Should match the prompt used by the CLI "batch" command.
const cliProcessPromptString = 'command> ';

class Client implements ActionableClient {
	public readonly email: string;

	public static async create(actionTracker: ActionTracker, context: FuzzContext) {
		const account = await createNewAccount(`${uuid.create()}@localhost`, context);

		try {
			return await this.fromAccount(account, actionTracker, context);
		} catch (error) {
			logger.error('Error creating client:', error);
			await account.onClientDisconnected();
			throw error;
		}
	}

	private static async fromAccount(account: AccountData, actionTracker: ActionTracker, context: FuzzContext) {
		const id = uuid.create();
		const profileDirectory = join(context.baseDir, id);
		await mkdir(profileDirectory);

		const apiData: ApiData = {
			token: createSecureRandom().replace(/[-]/g, '_'),
			port: await ClipperServer.instance().findAvailablePort(),
		};

		const client = new Client(
			context,
			actionTracker,
			actionTracker.track({ email: account.email }),
			account,
			profileDirectory,
			apiData,
			`${account.email}${account.associatedClientCount ? ` (${account.associatedClientCount})` : ''}`,
		);

		account.onClientConnected();

		// Joplin Server sync
		const targetId = context.isJoplinCloud ? '10' : '9';
		await client.execCliCommand_('config', 'sync.target', targetId);
		await client.execCliCommand_('config', `sync.${targetId}.path`, context.serverUrl);
		await client.execCliCommand_('config', `sync.${targetId}.username`, account.email);
		await client.execCliCommand_('config', `sync.${targetId}.password`, account.password);
		await client.execCliCommand_('config', 'api.token', apiData.token);
		await client.execCliCommand_('config', 'api.port', String(apiData.port));

		await client.execCliCommand_('e2ee', 'enable', '--password', account.e2eePassword);
		logger.info('Created and configured client');

		await client.startClipperServer_();
		return client;
	}

	private onCloseListeners_: OnCloseListener[] = [];

	private childProcess_: ChildProcessWrapper;
	private childProcessQueue_ = new AsyncActionQueue();
	private bufferedChildProcessStdout_: string[] = [];
	private bufferedChildProcessStderr_: string[] = [];
	private onChildProcessOutput_: ()=> void = ()=>{};

	private transcript_: string[] = [];

	private constructor(
		private readonly context_: FuzzContext,
		private readonly globalActionTracker_: ActionTracker,
		private readonly tracker_: ActionableClient,
		private readonly account_: AccountData,
		private readonly profileDirectory: string,
		private readonly apiData_: ApiData,
		private readonly clientLabel_: string,
	) {
		this.email = account_.email;

		// Don't skip child process-related tasks.
		this.childProcessQueue_.setCanSkipTaskHandler(() => false);

		const initializeChildProcess = () => {
			const rawChildProcess = spawn('yarn', [
				...this.cliCommandArguments,
				'batch',
				'--continue-on-failure',
				'-',
			], {
				cwd: cliDirectory,
			});
			rawChildProcess.stdout.on('data', (chunk: Buffer) => {
				const chunkString = chunk.toString('utf-8');
				this.transcript_.push(chunkString);

				this.bufferedChildProcessStdout_.push(chunkString);
				this.onChildProcessOutput_();
			});
			rawChildProcess.stderr.on('data', (chunk: Buffer) => {
				const chunkString = chunk.toString('utf-8');
				logger.warn('Child process', this.label, 'stderr:', chunkString);

				this.transcript_.push(chunkString);
				this.bufferedChildProcessStderr_.push(chunkString);
				this.onChildProcessOutput_();
			});

			this.childProcess_ = {
				writeStdin: (data: Buffer|string) => {
					this.transcript_.push(data.toString());
					rawChildProcess.stdin.write(data);
				},
				stderr: rawChildProcess.stderr,
				stdout: rawChildProcess.stdout,
				close: () => {
					rawChildProcess.stdin.destroy();
					rawChildProcess.kill();
				},
			};
		};
		initializeChildProcess();
	}

	private async startClipperServer_() {
		await this.execCliCommand_('server', '--quiet', '--exit-early', 'start');

		// Wait for the server to start
		await retryWithCount(async () => {
			await this.execApiCommand_('GET', '/ping');
		}, {
			count: 3,
			onFail: async () => {
				await msleep(1000);
			},
		});
	}

	private closed_ = false;
	public async close() {
		assert.ok(!this.closed_, 'should not be closed');

		await this.account_.onClientDisconnected();

		// Before removing the profile directory, verify that the profile directory is in the
		// expected location:
		const profileDirectory = resolvePathWithinDir(this.context_.baseDir, this.profileDirectory);
		assert.ok(profileDirectory, 'profile directory for client should be contained within the main temporary profiles directory (should be safe to delete)');
		await remove(profileDirectory);

		for (const listener of this.onCloseListeners_) {
			listener();
		}

		this.childProcess_.close();
		this.closed_ = true;
	}

	public onClose(listener: OnCloseListener) {
		this.onCloseListeners_.push(listener);
	}

	public async createClientOnSameAccount() {
		return await Client.fromAccount(this.account_, this.globalActionTracker_, this.context_);
	}

	public hasSameAccount(other: Client) {
		return other.account_ === this.account_;
	}

	public get label() {
		return this.clientLabel_;
	}

	private get cliCommandArguments() {
		return [
			'start',
			'--profile', this.profileDirectory,
			'--env', 'dev',
		];
	}

	public getHelpText() {
		return [
			`Client ${this.label}:`,
			`\tCommand: cd ${quotePath(cliDirectory)} && ${commandToString('yarn', this.cliCommandArguments)}`,
		].join('\n');
	}

	public getTranscript() {
		const lines = this.transcript_.join('').split('\n');
		return (
			lines
				// indent, for readability
				.map(line => `  ${line}`)
				// Since the server could still be running if the user posts the log, don't including
				// web clipper tokens in the output:
				.map(line => line.replace(/token=[a-z0-9A-Z_]+/g, 'token=*****'))
				// Don't include the sync password in the output
				.map(line => line.replace(/(config "(sync.9.password|api.token)") ".*"/, '$1 "****"'))
				.join('\n')
		);
	}

	// Connects the child process to the main terminal interface.
	// Useful for debugging.
	public async startCliDebugSession() {
		this.childProcessQueue_.push(async () => {
			this.onChildProcessOutput_ = () => {
				process.stdout.write(this.bufferedChildProcessStdout_.join('\n'));
				process.stderr.write(this.bufferedChildProcessStderr_.join('\n'));
				this.bufferedChildProcessStdout_ = [];
				this.bufferedChildProcessStderr_ = [];
			};
			this.bufferedChildProcessStdout_ = [];
			this.bufferedChildProcessStderr_ = [];
			process.stdout.write('CLI debug session. Enter a blank line or "exit" to exit.\n');
			process.stdout.write('To review a transcript of all interactions with this client,\n');
			process.stdout.write('enter "[transcript]".\n\n');
			process.stdout.write(cliProcessPromptString);

			const isExitRequest = (input: string) => {
				return input === 'exit' || input === '';
			};

			// Per https://github.com/nodejs/node/issues/32291, we can't pipe process.stdin
			// to childProcess_.stdin without causing issues. Forward using readline instead:
			const readline = createInterface({ input: process.stdin, output: process.stdout });
			let lastInput = '';
			do {
				lastInput = await readline.question('');
				if (lastInput === '[transcript]') {
					process.stdout.write(`\n\n# Transcript\n\n${this.getTranscript()}\n\n# End transcript\n\n`);
				} else if (!isExitRequest(lastInput)) {
					this.childProcess_.writeStdin(`${lastInput}\n`);
				}
			} while (!isExitRequest(lastInput));

			this.onChildProcessOutput_ = () => {};
			readline.close();
		});
		await this.childProcessQueue_.processAllNow();
	}

	private async execCliCommand_(commandName: string, ...args: string[]) {
		assert.match(commandName, /^[a-z]/, 'Command name must start with a lowercase letter.');
		let commandStdout = '';
		let commandStderr = '';
		this.childProcessQueue_.push(() => {
			return new Promise<void>(resolve => {
				this.onChildProcessOutput_ = () => {
					const lines = this.bufferedChildProcessStdout_.join('\n').split('\n');
					const promptIndex = lines.lastIndexOf(cliProcessPromptString);

					if (promptIndex >= 0) {
						commandStdout = lines.slice(0, promptIndex).join('\n');
						commandStderr = this.bufferedChildProcessStderr_.join('\n');

						resolve();
					} else {
						logger.debug('waiting...');
					}
				};
				this.bufferedChildProcessStdout_ = [];
				this.bufferedChildProcessStderr_ = [];
				const command = `${[commandName, ...args.map(arg => JSON.stringify(arg))].join(' ')}\n`;
				logger.debug('exec', command);
				this.childProcess_.writeStdin(command);
			});
		});
		await this.childProcessQueue_.processAllNow();
		return {
			stdout: commandStdout,
			stderr: commandStderr,
		};
	}

	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: 'GET', route: string): Promise<string>;
	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: 'POST'|'PUT', route: string, data: Json): Promise<string>;
	// eslint-disable-next-line no-dupe-class-members -- This is not a duplicate class member
	private async execApiCommand_(method: HttpMethod, route: string, data: Json|null = null): Promise<string> {
		route = route.replace(/^[/]/, '');
		const url = new URL(`http://localhost:${this.apiData_.port}/${route}`);
		url.searchParams.append('token', this.apiData_.token);

		this.transcript_.push(`\n[[${method} ${url}; body: ${JSON.stringify(data)}]]\n`);

		const response = await shim.fetch(url.toString(), {
			method,
			...(data ? { body: JSON.stringify(data) } : undefined),
		});

		if (!response.ok) {
			throw new Error(`Request to ${route} failed with error: ${await response.text()}`);
		}

		return await response.text();
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
			const response = JSON.parse(await this.execApiCommand_(
				method, `${route}?${searchParams}`,
			));
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
		const result = await this.execCliCommand_('e2ee', 'decrypt', '--force');
		if (!result.stdout.includes('Completed decryption.')) {
			throw new Error(`Decryption did not complete: ${result.stdout}`);
		}
	}

	public async sync() {
		logger.info('Sync', this.label);
		await this.tracker_.sync();

		await retryWithCount(async () => {
			const result = await this.execCliCommand_('sync');
			if (result.stdout.match(/Last error:/i)) {
				throw new Error(`Sync failed: ${result.stdout}`);
			}

			await this.decrypt_();
		}, {
			count: 4,
			// Certain sync failures self-resolve after a background task is allowed to
			// run. Delay:
			delayOnFailure: retry => retry * Second * 2,
			onFail: async (error) => {
				logger.debug('Sync error: ', error);
				logger.info('Sync failed. Retrying...');
			},
		});
	}

	public async createFolder(folder: FolderData) {
		logger.info('Create folder', folder.id, 'in', `${folder.parentId ?? 'root'}/${this.label}`);
		await this.tracker_.createFolder(folder);

		await this.execApiCommand_('POST', '/folders', {
			id: folder.id,
			title: folder.title,
			parent_id: folder.parentId ?? '',
		});
	}

	private async assertNoteMatchesState_(expected: NoteData) {
		await retryWithCount(async () => {
			const noteContent = (await this.execCliCommand_('cat', expected.id)).stdout;
			assert.equal(
				// Compare without trailing newlines for consistency, the output from "cat"
				// can sometimes have an extra newline (due to the CLI prompt)
				noteContent.trimEnd(),
				`${expected.title}\n\n${expected.body.trimEnd()}`,
				'note should exist',
			);
		}, {
			count: 3,
			onFail: async () => {
				// Send an event to the server and wait for it to be processed -- it's possible that the server
				// hasn't finished processing the API event for creating the note:
				await this.execApiCommand_('GET', '/ping');
			},
		});
	}

	public async createNote(note: NoteData) {
		logger.info('Create note', note.id, 'in', `${note.parentId}/${this.label}`);
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
		logger.info('Update note', note.id, 'in', `${note.parentId}/${this.label}`);
		await this.tracker_.updateNote(note);
		await this.execApiCommand_('PUT', `/notes/${encodeURIComponent(note.id)}`, {
			title: note.title,
			body: note.body,
			parent_id: note.parentId ?? '',
		});
		await this.assertNoteMatchesState_(note);
	}

	public async deleteNote(id: ItemId) {
		logger.info('Delete note', id, 'in', this.label);
		await this.tracker_.deleteNote(id);

		await this.execCliCommand_('rmnote', '--permanent', '--force', id);
	}

	public async deleteFolder(id: string) {
		logger.info('Delete folder', id, 'in', this.label);
		await this.tracker_.deleteFolder(id);

		await this.execCliCommand_('rmbook', '--permanent', '--force', id);
	}

	public async shareFolder(id: string, shareWith: Client, options: ShareOptions) {
		await this.tracker_.shareFolder(id, shareWith, options);

		const getPendingInvitations = async (target: Client) => {
			const shareWithIncoming = JSON.parse((await target.execCliCommand_('share', 'list', '--json')).stdout);
			return shareWithIncoming.invitations.filter((invitation: unknown) => {
				if (typeof invitation !== 'object' || !('accepted' in invitation)) {
					throw new Error('Invalid invitation format');
				}
				return !invitation.accepted;
			});
		};

		await retryWithCount(async () => {
			logger.info('Share', id, 'with', shareWith.label, options.readOnly ? '(read-only)' : '');
			const readOnlyArgs = options.readOnly ? ['--read-only'] : [];
			await this.execCliCommand_(
				'share', 'add', ...readOnlyArgs, id, shareWith.email,
			);

			await this.sync();
			await shareWith.sync();

			const pendingInvitations = await getPendingInvitations(shareWith);
			assert.deepEqual(pendingInvitations, [
				{
					accepted: false,
					waiting: true,
					rejected: false,
					canWrite: !options.readOnly,
					folderId: id,
					fromUser: {
						email: this.email,
					},
				},
			], 'there should be a single incoming share from the expected user');
		}, {
			count: 2,
			delayOnFailure: count => count * Second,
			onFail: (error)=>{
				logger.warn('Share failed:', error);
			},
		});

		await shareWith.execCliCommand_('share', 'accept', id);
		await shareWith.sync();
	}

	public async removeFromShare(id: string, other: Client) {
		await this.tracker_.removeFromShare(id, other);

		logger.info('Remove', other.label, 'from share', id);
		await this.execCliCommand_('share', 'remove', id, other.email);
		await other.sync();
	}

	public async deleteAssociatedShare(id: string) {
		await this.tracker_.deleteAssociatedShare(id);
		logger.info('Unshare', id, '(from', this.label, ')');
		await this.execCliCommand_('share', 'delete', '-f', id);
	}

	public async publishNote(id: ItemId) {
		await this.tracker_.publishNote(id);

		logger.info('Publish note', id, 'in', this.label);
		const publishOutput = await this.execCliCommand_('publish', '-f', id);
		const publishUrl = publishOutput.stdout.match(/http[s]?:\/\/\S+/);

		assert.notEqual(publishUrl, null, 'should log the publication URL');

		logger.info('Testing publication URL: ', publishUrl[0]);
		const fetchResult = await fetch(publishUrl[0]);

		if (!fetchResult.ok) {
			logger.warn('Fetch failed', fetchResult.statusText);
		}
		assert.equal(fetchResult.status, 200, `should be able to fetch the published note (status: ${fetchResult.statusText}).`);
	}

	public async unpublishNote(id: ItemId) {
		await this.tracker_.publishNote(id);

		logger.info('Unpublish note', id, 'in', this.label);
		await this.execCliCommand_('unpublish', id);
	}

	public async moveItem(itemId: ItemId, newParentId: ItemId) {
		logger.info('Move', itemId, 'to', newParentId);
		await this.tracker_.moveItem(itemId, newParentId);
		const movingToRoot = !newParentId;
		await this.execCliCommand_('mv', itemId, movingToRoot ? 'root' : newParentId);
	}

	public async listNotes() {
		const params = {
			fields: 'id,parent_id,body,title,is_conflict,conflict_original_id,share_id,is_shared',
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
					`[conflicts for ${getStringProperty(item, 'conflict_original_id')} in ${this.label}]`
				) : getStringProperty(item, 'parent_id'),
				title: getStringProperty(item, 'title'),
				body: getStringProperty(item, 'body'),
				isShared: getStringProperty(item, 'share_id') !== '',
				published: getNumberProperty(item, 'is_shared') === 1,
			}),
		);
	}

	public async listFolders() {
		const params = {
			fields: 'id,parent_id,title,share_id',
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
				isShared: getStringProperty(item, 'share_id') !== '',
			}),
		);
	}

	public async randomFolder(options: RandomFolderOptions) {
		return this.tracker_.randomFolder(options);
	}

	public async allFolderDescendants(parentId: ItemId) {
		return this.tracker_.allFolderDescendants(parentId);
	}

	public async randomNote(options: RandomNoteOptions) {
		return this.tracker_.randomNote(options);
	}

	public async checkState() {
		logger.info('Check state', this.label);

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

