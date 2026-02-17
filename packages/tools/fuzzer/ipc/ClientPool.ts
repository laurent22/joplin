import Logger from '@joplin/utils/Logger';
import ActionTracker from '../model/ActionTracker';
import Client from './Client';
import { FuzzContext } from '../types';
import { join } from 'path';
import { mkdir } from 'fs-extra';
import { readdir } from 'fs/promises';

type ClientFilter = (client: Client)=> boolean;

const logger = Logger.create('ClientPool');

export default class ClientPool {
	public static async create(context: FuzzContext) {
		return new ClientPool(context);
	}

	public static async fromSnapshot(snapshotDirectory: string, actionTracker: ActionTracker, context: FuzzContext) {
		const pool = await ClientPool.create(context);

		const matchingDirectories = (await readdir(snapshotDirectory))
			.filter(child => child.startsWith('client-'))
			.map(child => join(snapshotDirectory, child))
			.sort();

		const accounts = new Map();
		for (const clientDirectory of matchingDirectories) {
			const client = await Client.fromSnapshotDirectory(clientDirectory, actionTracker, context, accounts);
			pool.clients_.push(client);
			pool.listenForClientClose_(client);
		}

		return pool;
	}

	private clients_: Client[] = [];

	private constructor(
		private readonly context_: FuzzContext,
	) {
	}

	private listenForClientClose_(client: Client) {
		client.onClose(() => {
			this.clients_ = this.clients_.filter(other => other !== client);
		});
	}

	public async saveSnapshot(outputDirectory: string) {
		let i = 0;
		for (const client of this.clients) {
			const outputChildDirectory = join(outputDirectory, `client-${i++}`);
			await mkdir(outputChildDirectory);
			await client.saveSnapshot(outputChildDirectory);
		}
	}

	public async newClient(model: ActionTracker) {
		const client = await Client.create(model, this.context_);

		this.clients_.push(client);
		this.listenForClientClose_(client);
	}

	public async createRandomInitialItemsAndSync() {
		for (const client of this.clients) {
			logger.info('Creating items for ', client.email);
			const actionCount = this.context_.randomFrom([0, 10, 100]);
			await client.createOrUpdateMany(actionCount);

			await client.sync();
		}
	}

	public clientsByEmail(email: string) {
		return this.clients.filter(client => client.email === email);
	}

	public clientById(id: number) {
		const client = this.clients[id];
		if (!client) throw new Error(`Not found: ${id}`);
		return client;
	}

	public getClientId(client: Client): number {
		const index = this.clients.indexOf(client);
		if (index === -1) throw new Error(`Not found: ${client}`);
		return index;
	}

	public randomClient(filter: ClientFilter = ()=>true) {
		const clients = this.clients_.filter(filter);
		return clients[
			this.context_.randInt(0, clients.length)
		];
	}

	public async newWithSameAccount(sourceClient: Client) {
		const client = await sourceClient.createClientOnSameAccount();
		this.listenForClientClose_(client);
		this.clients_ = [...this.clients_, client];
		return client;
	}

	public othersWithSameAccount(client: Client) {
		return this.clients_.filter(other => other !== client && other.hasSameAccount(client));
	}

	public async checkState() {
		for (const client of this.clients_) {
			await client.checkState();
		}
	}

	public async syncAll() {
		// Sync all clients at roughly the same time. Some sync bugs are only apparent
		// when multiple clients are syncing simultaneously.
		await Promise.all(this.clients_.map(c => c.sync()));

		// Note: For more deterministic behavior, sync clients individually instead:
		//   for (const client of this.clients_) { await client.sync(); }
	}

	public get clients() {
		return [...this.clients_];
	}

	public helpText() {
		return this.clients_.map(client => client.getHelpText()).join('\n\n');
	}

	public async close() {
		for (const client of this.clients) {
			try {
				await client.close();
			} catch (error) {
				logger.warn('Failed to close client', error);
			}
		}
	}
}

