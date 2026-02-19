import { join } from 'path';
import Setting, { Env } from '@joplin/lib/models/Setting';
import Logger, { TargetType } from '@joplin/utils/Logger';
import { CleanupTask } from './types';
import yargs = require('yargs');
import { packagesDir } from './constants';
import { ActionSpec } from './ActionRunner';
import { readFile } from 'fs/promises';
import Fuzzer, { FuzzerConfig } from './Fuzzer';
const { shimInit } = require('@joplin/lib/shim-init-node');

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);
const logger = Logger.create('fuzzer');

const main = async (config: FuzzerConfig, restoreFromSnapshot: boolean) => {
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


	let fuzzer: Fuzzer|null = null;
	try {
		if (restoreFromSnapshot) {
			logger.info('Loading from snapshot. (Provided config options will be ignored)');
			fuzzer = await Fuzzer.fromSnapshot((task) => cleanupTasks.push(task));
		} else {
			logger.info('Starting:', config.isJoplinCloud ? '(cloud)' : '', 'random config:', config.randomConfig);
			fuzzer = await Fuzzer.fromConfig(
				config, (task) => cleanupTasks.push(task),
			);
		}
		cleanupTasks.push(async () => {
			fuzzer.stop();
		});

		await fuzzer.start();
	} catch (error) {
		logger.error('ERROR', error);
		if (fuzzer) {
			await fuzzer.openDebugSession();
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
					description: 'The maximum number of steps to take before stopping the fuzzer. Set to zero for an unlimited number of steps.',
				},
				'steps-between-syncs': {
					type: 'number',
					default: 3,
					description: 'The maximum number of sub-steps taken before all clients are synchronised.',
				},
				'clients': {
					type: 'number',
					default: 3,
					description: 'Number of client apps to create.',
				},
				'keep-accounts': {
					type: 'boolean',
					default: false,
					description: 'Whether to keep the created Joplin Server users after exiting. Default is to try to clean up, removing old accounts when exiting.',
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
					description: [
						'A path: If provided, this should be an absolute path to a Joplin Cloud repository. ',
						'This also enables testing for some Joplin Cloud-specific features (e.g. read-only shares).',
					].join(''),
				},
				'setup': {
					type: 'string',
					default: '',
					description: [
						'A path: If provided, this should point to a JSON file containing actions to run during startup. ',
						'The JSON file should contain an object similar to { "actions": [ ["newNote", {}] ], "clientCount": 1 }.',
					].join(''),
				},
				'snapshot-after': {
					type: 'number',
					default: -1,
					description: 'Save a snapshot of the fuzzer state after a certain number of steps.',
				},
				'restore-from-snapshot': {
					type: 'boolean',
					default: false,
					description: 'Restore the fuzzer state from the last snapshot (if any). To work, the server must be configured to use an SQLite development database. **Caution**: This will overwrite the server\'s development SQLite database.',
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
				randomConfig: {
					seed: argv.seed,
					randomStrings: argv.randomStrings,
				},
				stepConfig: {
					stopAfter: argv.steps,
					actionsPerStep: argv['steps-between-syncs'],
					snapshotAfter: argv.snapshotAfter,
				},
				clientCount,
				serverPath: serverPath,
				isJoplinCloud: !!argv.joplinCloud,
				keepAccountsOnClose: argv.keepAccounts,
				enableE2ee: argv.enableE2ee,
				setupActions: setupData?.setupActions ?? defaultSetupActions(clientCount),
			}, argv.restoreFromSnapshot);
		},
	)
	.demandCommand()
	.help()
	.argv;
