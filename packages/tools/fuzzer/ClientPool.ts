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
		public readonly clients: Client[],
	) { }

	public randomClient(filter: ClientFilter = ()=>true) {
		const clients = this.clients.filter(filter);
		return clients[
			this.context_.randInt(0, clients.length)
		];
	}

	public async checkState() {
		for (const client of this.clients) {
			await client.checkState(this.clients);
		}
	}

	public async syncAll() {
		for (const client of this.clients) {
			await client.sync();
		}
	}

	public helpText() {
		return this.clients.map(client => client.getHelpText()).join('\n\n');
	}
}

