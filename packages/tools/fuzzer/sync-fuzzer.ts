import uuid from '@joplin/lib/uuid';
import { join } from 'path';
import { exists, mkdir, remove } from 'fs-extra';
import Setting, { Env } from '@joplin/lib/models/Setting';
import Logger, { TargetType } from '@joplin/utils/Logger';
import { waitForCliInput } from '@joplin/utils/cli';
import Server from './Server';
import { CleanupTask, FuzzContext } from './types';
import ClientPool from './ClientPool';
import retryWithCount from './utils/retryWithCount';
import Client from './Client';
import SeededRandom from './utils/SeededRandom';
import { env } from 'process';
import yargs = require('yargs');
import { strict as assert } from 'assert';
const { shimInit } = require('@joplin/lib/shim-init-node');

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);
const logger = Logger.create('fuzzer');

const createProfilesDirectory = async () => {
	const path = join(__dirname, 'profiles-tmp');
	if (await exists(path)) {
		throw new Error([
			'Another instance of the sync fuzzer may be running!',
			'The parent directory for test profiles already exists. An instance of the fuzzer is either already running or was closed before it could clean up.',
			`To ignore this issue, delete ${JSON.stringify(path)} and re-run the fuzzer.`,
		].join('\n'));
	}

	await mkdir(path);
	return {
		path,
		remove: async () => {
			await remove(path);
		},
	};
};

const doRandomAction = async (context: FuzzContext, client: Client, clientPool: ClientPool) => {
	const selectOrCreateParentFolder = async () => {
		let parentId = (await client.randomFolder({}))?.id;

		// Create a toplevel folder to serve as this
		// folder's parent if none exist yet
		if (!parentId) {
			parentId = uuid.create();
			await client.createFolder({
				parentId: '',
				id: parentId,
				title: 'Parent folder',
			});
		}

		return parentId;
	};

	const selectOrCreateNote = async () => {
		let note = await client.randomNote();

		if (!note) {
			await client.createNote({
				parentId: await selectOrCreateParentFolder(),
				id: uuid.create(),
				title: 'Test note',
				body: 'Body',
			});

			note = await client.randomNote();
			assert.ok(note, 'should have selected a random note');
		}

		return note;
	};

	const actions = {
		newSubfolder: async () => {
			const folderId = uuid.create();
			const parentId = await selectOrCreateParentFolder();

			await client.createFolder({
				parentId: parentId,
				id: folderId,
				title: 'Subfolder',
			});

			return true;
		},
		newToplevelFolder: async () => {
			const folderId = uuid.create();
			await client.createFolder({
				parentId: null,
				id: folderId,
				title: `Folder ${context.randInt(0, 1000)}`,
			});

			return true;
		},
		newNote: async () => {
			const parentId = await selectOrCreateParentFolder();
			await client.createNote({
				parentId: parentId,
				title: `Test (x${context.randInt(0, 1000)})`,
				body: 'Testing...',
				id: uuid.create(),
			});

			return true;
		},
		renameNote: async () => {
			const note = await selectOrCreateNote();

			await client.updateNote({
				...note,
				title: `Renamed (${context.randInt(0, 1000)})`,
			});

			return true;
		},
		updateNoteBody: async () => {
			const note = await selectOrCreateNote();

			await client.updateNote({
				...note,
				body: `${note.body}\n\nUpdated.\n`,
			});

			return true;
		},
		moveNote: async () => {
			const note = await client.randomNote();
			if (!note) return false;
			const targetParent = await client.randomFolder({
				filter: folder => folder.id !== note.parentId,
			});
			if (!targetParent) return false;

			await client.moveItem(note.id, targetParent.id);

			return true;
		},
		shareFolder: async () => {
			const target = await client.randomFolder({
				filter: candidate => (
					!candidate.parentId && !candidate.isShareRoot
				),
			});
			if (!target) return false;

			const other = clientPool.randomClient(c => c !== client);
			await client.shareFolder(target.id, other);
			return true;
		},
		deleteFolder: async () => {
			const target = await client.randomFolder({});
			if (!target) return false;

			await client.deleteFolder(target.id);
			return true;
		},
		moveFolderToToplevel: async () => {
			const target = await client.randomFolder({
				// Don't choose items that are already toplevel
				filter: item => !!item.parentId,
			});
			if (!target) return false;

			await client.moveItem(target.id, '');
			return true;
		},
		moveFolderTo: async () => {
			const target = await client.randomFolder({
				// Don't move shared folders (should not be allowed by the GUI in the main apps).
				filter: item => !item.isShareRoot,
			});
			if (!target) return false;

			const targetDescendants = new Set(await client.allFolderDescendants(target.id));

			const newParent = await client.randomFolder({
				filter: (item) => {
					// Avoid making the folder a child of itself
					return !targetDescendants.has(item.id);
				},
			});
			if (!newParent) return false;

			await client.moveItem(target.id, newParent.id);
			return true;
		},
	};

	const actionKeys = [...Object.keys(actions)] as (keyof typeof actions)[];

	let result = false;
	while (!result) { // Loop until an action was done
		const randomAction = actionKeys[context.randInt(0, actionKeys.length)];
		logger.info(`Action: ${randomAction} in ${client.email}`);
		result = await actions[randomAction]();
		if (!result) {
			logger.info(`  ${randomAction} was skipped (preconditions not met).`);
		}
	}
};

interface Options {
	seed: number;
	maximumSteps: number;
	maximumStepsBetweenSyncs: number;
	clientCount: number;
}

const main = async (options: Options) => {
	shimInit();
	Setting.setConstant('env', Env.Dev);

	const cleanupTasks: CleanupTask[] = [];

	const cleanUp = async () => {
		logger.info('Cleaning up....');
		while (cleanupTasks.length) {
			const task = cleanupTasks.pop();
			try {
				await task();
			} catch (error) {
				logger.warn('Clean up task failed:', error);
			}
		}
	};

	// Run cleanup on Ctrl-C
	process.on('SIGINT', async () => {
		logger.info('Intercepted ctrl-c. Cleaning up...');
		await cleanUp();
		process.exit(1);
	});

	let clientHelpText;

	try {
		const joplinServerUrl = 'http://localhost:22300/';
		const server = new Server(joplinServerUrl, {
			email: 'admin@localhost',
			password: env['FUZZER_SERVER_ADMIN_PASSWORD'] ?? 'admin',
		});
		cleanupTasks.push(() => server.close());

		if (!await server.checkConnection()) {
			throw new Error('Could not connect to the server.');
		}

		const profilesDirectory = await createProfilesDirectory();
		cleanupTasks.push(profilesDirectory.remove);

		logger.info('Starting with seed', options.seed);
		const random = new SeededRandom(options.seed);

		const fuzzContext: FuzzContext = {
			serverUrl: joplinServerUrl,
			baseDir: profilesDirectory.path,
			execApi: server.execApi.bind(server),
			randInt: (a, b) => random.nextInRange(a, b),
		};
		const clientPool = await ClientPool.create(
			fuzzContext,
			options.clientCount,
			task => { cleanupTasks.push(task); },
		);
		clientHelpText = clientPool.helpText();

		const maxSteps = options.maximumSteps;
		for (let stepIndex = 1; maxSteps <= 0 || stepIndex <= maxSteps; stepIndex++) {
			const client = clientPool.randomClient();

			// Ensure that the client starts up-to-date with the other synced clients.
			await client.sync();

			logger.info('Step', stepIndex, '/', maxSteps > 0 ? maxSteps : 'Infinity');
			const actionsBeforeFullSync = fuzzContext.randInt(1, options.maximumStepsBetweenSyncs + 1);
			for (let subStepIndex = 1; subStepIndex <= actionsBeforeFullSync; subStepIndex++) {
				if (actionsBeforeFullSync > 1) {
					logger.info('Sub-step', subStepIndex, '/', actionsBeforeFullSync, '(in step', stepIndex, ')');
				}
				await doRandomAction(fuzzContext, client, clientPool);
			}
			await client.sync();

			// .checkState can fail occasionally due to incomplete
			// syncs (perhaps because the server is still processing
			// share-related changes?). Allow this to be retried:
			await retryWithCount(async () => {
				await clientPool.checkState();
			}, {
				count: 3,
				onFail: async () => {
					logger.info('.checkState failed. Syncing all clients...');
					await clientPool.syncAll();
				},
			});
		}
	} catch (error) {
		logger.error('ERROR', error);
		if (clientHelpText) {
			logger.info('Client information:\n', clientHelpText);
		}
		logger.info('An error occurred. Pausing before continuing cleanup.');
		await waitForCliInput();
		process.exitCode = 1;
	} finally {
		await cleanUp();

		logger.info('Cleanup complete');
		process.exit();
	}
};


void yargs
	.usage('$0 <cmd>')
	.command(
		'start',
		[
			'Starts the synchronization fuzzer. The fuzzer starts Joplin Server, creates multiple CLI clients, and attempts to find sync bugs.\n\n',
			'The fuzzer starts Joplin Server in development mode, using the existing development mode database and uses the admin@localhost user to',
			'create and set up user accounts.\n',
			'Use the FUZZER_SERVER_ADMIN_PASSWORD environment variable to specify the admin@localhost password for this dev version of Joplin Server.\n\n',
			'If the fuzzer detects incorrect/unexpected client state, it pauses, allowing the profile directories and databases',
			'of the clients to be inspected.',
		].join(' '),
		(yargs) => {
			return yargs.options({
				'seed': { type: 'number', default: 12345 },
				'steps': {
					type: 'number',
					default: 0,
					defaultDescription: 'The maximum number of steps to take before stopping the fuzzer. Set to zero for an unlimited number of steps.',
				},
				'steps-between-syncs': {
					type: 'number',
					default: 3,
					defaultDescription: 'The maximum number of sub-steps taken before all clients are synchronised.',
				},
				'clients': {
					type: 'number',
					default: 3,
					defaultDescription: 'Number of client apps to create.',
				},
			});
		},
		async (argv) => {
			await main({
				seed: argv.seed,
				maximumSteps: argv.steps,
				clientCount: argv.clients,
				maximumStepsBetweenSyncs: argv['steps-between-syncs'],
			});
		},
	)
	.help()
	.argv;
