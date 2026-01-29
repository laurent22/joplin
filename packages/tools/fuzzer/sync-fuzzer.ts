import { join } from 'path';
import { exists, mkdir, remove } from 'fs-extra';
import Setting, { Env } from '@joplin/lib/models/Setting';
import Logger, { TargetType } from '@joplin/utils/Logger';
import Server from './Server';
import { CleanupTask, FuzzContext } from './types';
import ClientPool from './ClientPool';
import SeededRandom from './utils/SeededRandom';
import { env } from 'process';
import yargs = require('yargs');
import openDebugSession from './utils/openDebugSession';
import { packagesDir } from './constants';
import ActionRunner, { ActionSpec } from './ActionRunner';
import randomString from './utils/randomString';
import { readFile } from 'fs/promises';
import randomId from './utils/randomId';
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

interface Options {
	seed: number;
	maximumSteps: number;
	maximumStepsBetweenSyncs: number;
	enableE2ee: boolean;
	randomStrings: boolean;
	clientCount: number;
	keepAccountsOnClose: boolean;
	setupActions: ActionSpec[];

	serverPath: string;
	isJoplinCloud: boolean;
}

const createContext = (options: Options, server: Server, profilesDirectory: string) => {
	const random = new SeededRandom(options.seed);
	// Use a separate random number generator for strings and IDs. This prevents
	// the random strings setting from affecting the other output.
	const stringRandom = new SeededRandom(random.next());
	const idRandom = new SeededRandom(random.next());

	if (options.isJoplinCloud) {
		logger.info('Sync target: Joplin Cloud');
	}

	let stringCount = 0;
	const randomStringGenerator = (() => {
		if (options.randomStrings) {
			return randomString((min, max) => stringRandom.nextInRange(min, max));
		} else {
			return (_targetLength: number) => `Placeholder (x${stringCount++})`;
		}
	})();
	const randomIdGenerator = randomId((min, max) => idRandom.nextInRange(min, max));

	const fuzzContext: FuzzContext = {
		serverUrl: server.url,
		isJoplinCloud: options.isJoplinCloud,
		enableE2ee: options.enableE2ee,
		baseDir: profilesDirectory,

		execApi: server.execApi.bind(server),
		randInt: (a, b) => random.nextInRange(a, b),
		randomFrom: (data) => data[random.nextInRange(0, data.length)],
		randomString: randomStringGenerator,
		randomId: randomIdGenerator,
		keepAccounts: options.keepAccountsOnClose,
	};
	return fuzzContext;
};

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

	let clientPool: ClientPool|null = null;

	try {
		const joplinServerUrl = 'http://localhost:22300/';
		const server = new Server(options.serverPath, joplinServerUrl, {
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

		const fuzzContext = createContext(options, server, profilesDirectory.path);
		clientPool = await ClientPool.create(
			fuzzContext,
			options.clientCount,
			task => { cleanupTasks.push(task); },
		);

		const actionRunner = new ActionRunner(fuzzContext, clientPool, clientPool.randomClient());
		logger.info('Starting setup:');
		await actionRunner.doActions(options.setupActions);

		logger.info('Starting randomized actions:');
		const maxSteps = options.maximumSteps;
		for (let stepIndex = 1; maxSteps <= 0 || stepIndex <= maxSteps; stepIndex++) {
			const client = clientPool.randomClient();
			actionRunner.switchClient(client);

			// Ensure that the client starts up-to-date with the other synced clients.
			await client.sync();

			logger.info('Step', stepIndex, '/', maxSteps > 0 ? maxSteps : 'Infinity');
			const actionsBeforeFullSync = fuzzContext.randInt(1, options.maximumStepsBetweenSyncs + 1);
			for (let subStepIndex = 1; subStepIndex <= actionsBeforeFullSync; subStepIndex++) {
				if (actionsBeforeFullSync > 1) {
					logger.info('Sub-step', subStepIndex, '/', actionsBeforeFullSync, '(in step', stepIndex, ')');
				}
				await actionRunner.doRandomAction();
			}

			await actionRunner.syncAndCheckState();
		}
	} catch (error) {
		logger.error('ERROR', error);
		if (clientPool) {
			logger.info('Client information:\n', clientPool.helpText());
			await openDebugSession(clientPool);
		}
		process.exitCode = 1;
	} finally {
		await cleanUp();

		logger.info('Cleanup complete');
		process.exit();
	}
};

const readSetupFile = async (path: string) => {
	const setupActionFile = await readFile(path, 'utf-8');
	const setupData = JSON.parse(setupActionFile);

	const errorLabel = `Reading ${path}.`;

	const readNumber = <T extends object> (key: keyof T, parent: T) => {
		if (typeof parent[key] !== 'number') {
			throw new Error(`${errorLabel} Expected key ${String(key)} to be a number. Was ${typeof parent[key]}.`);
		}

		return parent[key];
	};
	const readArray = <T extends object> (key: keyof T, parent: T) => {
		if (!Array.isArray(parent[key])) {
			throw new Error(`${errorLabel} Expected key ${String(key)} to be an array. Was ${typeof parent[key]}.`);
		}

		return parent[key];
	};

	const clientCount = readNumber('clientCount', setupData);

	const initialActions: unknown[] = readArray('actions', setupData);
	const actions: ActionSpec[] = initialActions
		.map((action: unknown, index: number) => {
			if (typeof action === 'string') {
				const isComment = action.startsWith('//');
				if (isComment) {
					return { key: 'comment', options: { message: action.substring(2).trimStart() } };
				}
				return { key: action, options: {} };
			}

			if (!Array.isArray(action) || action.length < 1 || action.length > 2) {
				throw new Error(`${errorLabel} In 'actions'. Expected an array of length 1 or 2. (Reading item ${JSON.stringify(action)} at index: ${index})`);
			}

			const key = action[0];
			const options = action[1] ?? {};
			return { key, options } as ActionSpec;
		});

	return { clientCount, setupActions: actions };
};

const defaultSetupActions = (clientCount: number) => {
	const actions = [];
	for (let i = 0; i < clientCount; i++) {
		actions.push(
			{ key: 'switchClient', options: { id: i } },
			{ key: 'createOrUpdateMany', options: {} },
			{ key: 'sync', options: {} },
		);
	}
	return actions;
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
				'keep-accounts': {
					type: 'boolean',
					default: false,
					defaultDescription: 'Whether to keep the created Joplin Server users after exiting. Default is to try to clean up, removing old accounts when exiting.',
				},
				'enable-e2ee': {
					type: 'boolean',
					default: true,
					description: 'Whether to enable end-to-end encryption',
				},
				'random-strings': {
					type: 'boolean',
					default: true,
					description: 'Whether to generate text using pseudorandom Unicode characters. Disabling this can simplify debugging.',
				},
				'joplin-cloud': {
					type: 'string',
					default: '',
					defaultDescription: [
						'A path: If provided, this should be an absolute path to a Joplin Cloud repository. ',
						'This also enables testing for some Joplin Cloud-specific features (e.g. read-only shares).',
					].join(''),
				},
				'setup': {
					type: 'string',
					default: '',
					defaultDescription: [
						'A path: If provided, this should point to a JSON file containing actions to run during startup. ',
						'The JSON file should contain an object similar to { "actions": [ ["newNote", {}] ], "clientCount": 1 }.',
					].join(''),
				},
			});
		},
		async (argv) => {
			const serverPath = argv.joplinCloud ? argv.joplinCloud : join(packagesDir, 'server');

			let setupData = undefined;
			if (argv.setup) {
				setupData = await readSetupFile(argv.setup);
			}

			const clientCount = setupData?.clientCount ?? argv.clients;
			await main({
				seed: argv.seed,
				maximumSteps: argv.steps,
				clientCount,
				serverPath: serverPath,
				isJoplinCloud: !!argv.joplinCloud,
				maximumStepsBetweenSyncs: argv['steps-between-syncs'],
				keepAccountsOnClose: argv.keepAccounts,
				enableE2ee: argv.enableE2ee,
				randomStrings: argv.randomStrings,
				setupActions: setupData?.setupActions ?? defaultSetupActions(clientCount),
			});
		},
	)
	.demandCommand()
	.help()
	.argv;
