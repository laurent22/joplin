import Logger from '@joplin/utils/Logger';
import ActionTracker from './ActionTracker';
import Client from './Client';
import { CleanupTask, FuzzContext } from './types';

type AddCleanupTask = (task: CleanupTask)=> void;
type ClientFilter = (client: Client)=> boolean;

const logger = Logger.create('ClientPool');

export default class ClientPool {
	public static async create(
		context: FuzzContext,
		clientCount: number,
		addCleanupTask: AddCleanupTask,
	) {
		if (clientCount <= 0) throw new Error('There must be at least 1 client');

		const actionTracker = new ActionTracker(context);
		const clientPool: Client[] = [];
		for (let i = 0; i < clientCount; i++) {
			const client = await Client.create(actionTracker, context);
			addCleanupTask(() => client.close());
			clientPool.push(client);
		}

		return new ClientPool(context, clientPool);
	}
	private constructor(
		private readonly context_: FuzzContext,
		private clients_: Client[],
	) {
		for (const client of clients_) {
			this.listenForClientClose_(client);
		}
	}

	private listenForClientClose_(client: Client) {
		client.onClose(() => {
			this.clients_ = this.clients_.filter(other => other !== client);
		});
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
}

