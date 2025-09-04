import ActionTracker from './ActionTracker';
import Client from './Client';
import { CleanupTask, FuzzContext } from './types';

type AddCleanupTask = (task: CleanupTask)=> void;
type ClientFilter = (client: Client)=> boolean;

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
	public constructor(
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

	public clientsByEmail(email: string) {
		return this.clients.filter(client => client.email === email);
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
		for (const client of this.clients_) {
			await client.sync();
		}
	}

	public get clients() {
		return [...this.clients_];
	}

	public helpText() {
		return this.clients_.map(client => client.getHelpText()).join('\n\n');
	}
}

