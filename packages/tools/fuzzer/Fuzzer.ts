import { exists, mkdir, pathExists, readdir, remove, writeFile } from 'fs-extra';
import ActionRunner, { ActionSpec } from './ActionRunner';
import ClientPool from './ipc/ClientPool';
import Server from './ipc/Server';
import ActionTracker from './model/ActionTracker';
import { CleanupTask, FuzzContext } from './types';
import SeededRandom, { RandomState } from './utils/SeededRandom';
import { join } from 'path';
import Logger from '@joplin/utils/Logger';
import randomString from './utils/randomString';
import randomId from './utils/randomId';
import { ItemId } from './model/types';
import openDebugSession from './utils/openDebugSession';
import { readFile } from 'fs/promises';

const logger = Logger.create('Fuzzer');

interface FuzzerState {
	model: ActionTracker;
	generalRandom: SeededRandom;
	stringRandom: SeededRandom;
	idRandom: SeededRandom;
	currentStep: number;
}

// It's possible to seed the random number generator either
// 1) with a single seed or 2) provide the last full state of each generator.
type SeedConfig = {
	seed: number;

	generalRandomState?: undefined;
	stringRandomState?: undefined;
	idRandomState?: undefined;
} | {
	seed?: undefined;

	generalRandomState: RandomState;
	stringRandomState: RandomState;
	idRandomState: RandomState;
};

type RandomConfig = SeedConfig & {
	randomStrings: boolean;
};

interface StepConfig {
	snapshotAfter: number;

	stopAfter: number;
	actionsPerStep: number;
}

export interface FuzzerConfig {
	randomConfig: RandomConfig;
	stepConfig: StepConfig;

	enableE2ee: boolean;
	clientCount: number;
	keepAccountsOnClose: boolean;
	setupActions: ActionSpec[];

	serverPath: string;
	isJoplinCloud: boolean;
}

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

const snapshotsPath = join(__dirname, 'snapshots');
const makeSnapshotsDirectory = async () => {
	if (!await exists(snapshotsPath)) {
		await mkdir(snapshotsPath);
	}

	return snapshotsPath;
};

const clearSnapshotsDirectory = async () => {
	if (await exists(snapshotsPath)) {
		await remove(snapshotsPath);
	}
};

type RandomNumberGenerators = {
	generalRandom: SeededRandom;
	stringRandom: SeededRandom;
	idRandom: SeededRandom;

	randomStringGenerator: (length: number)=> string;
	randomIdGenerator: ()=> ItemId;
};

const createRandomNumberGenerators = (config: RandomConfig): RandomNumberGenerators => {
	const createRandom = (initialState: RandomState|undefined, fallbackSeed: ()=> bigint|number) => {
		return initialState ? SeededRandom.fromState(initialState) : new SeededRandom(fallbackSeed());
	};

	const random = createRandom(config.generalRandomState, () => config.seed ?? 0);
	// Use a separate random number generator for strings and IDs. This prevents
	// the random strings setting from affecting the other output.
	const stringRandom = createRandom(config.stringRandomState, () => random.next());
	const idRandom = createRandom(config.idRandomState, () => random.next());

	// Wrap the low-level random number generators in higher-level APIs:
	let stringCount = 0;
	const randomStringGenerator = (() => {
		if (config.randomStrings) {
			return randomString((min, max) => stringRandom.nextInRange(min, max));
		} else {
			return (_targetLength: number) => `Placeholder (x${stringCount++})`;
		}
	})();
	const randomIdGenerator = randomId((min, max) => idRandom.nextInRange(min, max));

	return {
		generalRandom: random,
		stringRandom,
		idRandom,

		randomStringGenerator,
		randomIdGenerator,
	};
};


const createContext = (config: FuzzerConfig, random: RandomNumberGenerators, server: Server, profilesDirectory: string) => {
	const fuzzContext: FuzzContext = {
		serverUrl: server.url,
		isJoplinCloud: config.isJoplinCloud,
		enableE2ee: config.enableE2ee,
		baseDir: profilesDirectory,

		execApi: server.execApi.bind(server),
		randInt: (a, b) => random.generalRandom.nextInRange(a, b),
		randomFrom: (data) => data[random.generalRandom.nextInRange(0, data.length)],
		randomString: random.randomStringGenerator,
		randomId: random.randomIdGenerator,
		keepAccounts: config.keepAccountsOnClose,
	};
	return fuzzContext;
};


export default class Fuzzer {
	private closed_ = false;

	private constructor(
		private state_: FuzzerState,
		private config_: FuzzerConfig,
		private clients_: ClientPool,
		private server_: Server,
		private actionRunner_: ActionRunner,
		private context_: FuzzContext,
	) {
	}

	private static async setupContextAndRandom_(
		config: FuzzerConfig,
		server: Server,
		onCleanup: (task: CleanupTask)=> void,
	) {
		const profilesDirectory = await createProfilesDirectory();
		onCleanup(profilesDirectory.remove);

		const random = createRandomNumberGenerators(config.randomConfig);
		const context = createContext(config, random, server, profilesDirectory.path);

		return { context, random };
	}

	private static serverConfig_(config: FuzzerConfig) {
		return {
			baseUrl: 'http://localhost:22300/',
			baseDirectory: config.serverPath,
			adminAuth: {
				email: 'admin@localhost',
				password: process.env['FUZZER_SERVER_ADMIN_PASSWORD'] ?? 'admin',
			},
		};
	}

	public static async fromConfig(
		config: FuzzerConfig,
		onCleanup: (task: CleanupTask)=> void,
	) {
		const server = new Server(this.serverConfig_(config));
		onCleanup(() => server.close());

		if (!await server.checkConnection()) {
			throw new Error('Could not connect to the server.');
		}

		const { context, random } = await this.setupContextAndRandom_(config, server, onCleanup);

		const model = new ActionTracker(context);

		const clientPool = await ClientPool.create(context);
		onCleanup(() => clientPool.close());

		for (let i = 0; i < config.clientCount; i++) {
			await clientPool.newClient(model);
		}

		const actionRunner = new ActionRunner(context, clientPool, clientPool.randomClient());
		const state: FuzzerState = {
			currentStep: 0,
			generalRandom: random.generalRandom,
			idRandom: random.idRandom,
			stringRandom: random.stringRandom,
			model,
		};

		return new Fuzzer(
			state,
			config,
			clientPool,
			server,
			actionRunner,
			context,
		);
	}

	public static async fromSnapshot(onCleanup: (task: CleanupTask)=> void) {
		const snapshotDirectory = await makeSnapshotsDirectory();
		const stateJson = JSON.parse(
			await readFile(join(snapshotDirectory, 'state.json'), 'utf-8'),
		);

		const config: FuzzerConfig = stateJson.config;

		const server = await Server.fromSnapshot({
			...this.serverConfig_(config),
			snapshotDirectory: snapshotDirectory,
		});
		onCleanup(() => server.close());

		if (!await server.checkConnection()) {
			throw new Error('Could not connect to the server.');
		}

		const { context, random } = await this.setupContextAndRandom_(config, server, onCleanup);

		const model = ActionTracker.fromSnapshot(stateJson.model, context);

		const clientPool = await ClientPool.fromSnapshot(join(snapshotDirectory, 'clients'), model, context);
		onCleanup(() => clientPool.close());

		const actionRunner = new ActionRunner(
			context, clientPool, clientPool.clients[0],
		);
		const state: FuzzerState = {
			currentStep: stateJson.currentStep,
			generalRandom: random.generalRandom,
			idRandom: random.idRandom,
			stringRandom: random.stringRandom,
			model,
		};

		return new Fuzzer(
			state,
			config,
			clientPool,
			server,
			actionRunner,
			context,
		);
	}

	private async saveSnapshot_(outputDirectory: string) {
		logger.info('Saving a snapshot to', outputDirectory);
		if (!await pathExists(outputDirectory)) {
			throw new Error('Output directory does not exist');
		}
		const stats = await readdir(outputDirectory);
		if (stats.length > 0) {
			throw new Error(`Output directory must be empty (Try removing ${outputDirectory})`);
		}

		// Converts RandomState to a value that can be serialized
		const serializeRandomState = (state: RandomState) => {
			return { value: String(state.value), step: String(state.step) };
		};

		await writeFile(
			join(outputDirectory, 'state.json'),
			JSON.stringify({
				currentStep: this.state_.currentStep,
				accountEmails: this.state_.model.getAccountEmails(),

				config: {
					...this.config_,
					randomConfig: {
						randomStrings: this.config_.randomConfig.randomStrings,
						seed: undefined,

						generalRandomState: serializeRandomState(this.state_.generalRandom.state),
						idRandomState: serializeRandomState(this.state_.idRandom.state),
						stringRandomState: serializeRandomState(this.state_.stringRandom.state),
					} satisfies RandomConfig,
				},
				model: this.state_.model.serialize(),
			}, undefined, '\t'),
		);

		const serverDir = join(outputDirectory, 'server');
		await mkdir(serverDir);
		await this.server_.saveSnapshot(serverDir);

		const clientsDir = join(outputDirectory, 'clients');
		await mkdir(clientsDir);
		await this.clients_.saveSnapshot(clientsDir);
	}

	public async start() {
		if (this.config_.stepConfig.snapshotAfter >= 0) {
			this.server_.assertCanUseSnapshots();
		}

		if (this.state_.currentStep <= 0) {
			logger.info('Starting setup:');
			await this.actionRunner_.doActions(this.config_.setupActions);
		} else {
			logger.info('Skipping setup...');
		}

		logger.info('Starting randomized actions:', this.state_.generalRandom.state);
		const maxSteps = this.config_.stepConfig.stopAfter;
		for (
			let stepIndex = this.state_.currentStep + 1;
			(maxSteps <= 0 || stepIndex <= maxSteps) && !this.closed_;
			stepIndex++
		) {
			this.state_.currentStep = stepIndex;

			const client = this.clients_.randomClient();
			this.actionRunner_.switchClient(client);

			// Ensure that the client starts up-to-date with the other synced clients.
			await client.sync();

			logger.info('Step', stepIndex, '/', maxSteps > 0 ? maxSteps : 'Infinity');
			const actionsBeforeFullSync = this.context_.randInt(1, this.config_.stepConfig.actionsPerStep + 1);
			for (let subStepIndex = 1; subStepIndex <= actionsBeforeFullSync; subStepIndex++) {
				if (actionsBeforeFullSync > 1) {
					logger.info('Sub-step', subStepIndex, '/', actionsBeforeFullSync, '(in step', stepIndex, ')');
				}
				await this.actionRunner_.doRandomAction();
			}


			await this.actionRunner_.syncAndCheckState();

			if (stepIndex === this.config_.stepConfig.snapshotAfter) {
				await clearSnapshotsDirectory();
				await this.saveSnapshot_(await makeSnapshotsDirectory());
			}
		}
	}

	public async openDebugSession() {
		logger.info('Client information:\n', this.clients_.helpText());
		await openDebugSession(this.clients_);
	}

	public stop() {
		this.closed_ = true;
	}
}
