import { Knex } from 'knex';
import { DbConnection } from '../db';

interface TransactionInfo {
	name: string;
	index: number;
	timestamp: Date;
}

// This transaction handler allows abstracting away the complexity of managing nested transactions
// within models.
// Any method in a model can start a transaction and, if one is already started, it
// simply won't do anything. The last active transaction commits the results. If a rollback
// happens, the following calls to rollback will be a no-op.
// Set logEnabled_ to `true` to see what happens with nested transactions.
export default class TransactionHandler {

	private transactionStack_: TransactionInfo[] = [];
	private activeTransaction_: Knex.Transaction = null;
	private transactionIndex_ = 0;
	private logEnabled_ = false;
	private db_: Knex = null;

	public constructor(db: DbConnection) {
		this.db_ = db;
	}

	private get db(): DbConnection {
		return this.db_;
	}

	public setDb(db: DbConnection) {
		this.db_ = db;
	}

	private log(s: string): void {
		if (!this.logEnabled_) return;
		// eslint-disable-next-line no-console
		console.info(`TransactionHandler: ${s}`);
	}

	public get activeTransaction(): Knex.Transaction {
		return this.activeTransaction_;
	}

	public get stackInfo(): string {
		const output: string[] = [];
		for (const t of this.transactionStack_) {
			output.push(`#${t.index}: ${t.name}: ${t.timestamp.toUTCString()}`);
		}
		return output.join('\n');
	}

	public async start(name: string): Promise<number> {
		const txIndex = ++this.transactionIndex_;
		this.log(`Starting transaction: ${txIndex}`);

		if (!this.transactionStack_.length) {
			if (this.activeTransaction_) throw new Error('An active transaction was found when no transaction was in stack'); // Sanity check
			this.log(`Trying to acquire transaction: ${txIndex}`);
			this.activeTransaction_ = await this.db.transaction();
			this.log(`Got transaction: ${txIndex}`);
		}

		this.transactionStack_.push({
			name,
			index: txIndex,
			timestamp: new Date(),
		});

		return txIndex;
	}

	private finishTransaction(txIndex: number): boolean {
		if (!this.transactionStack_.length) throw new Error('Committing but no transaction was started');
		const lastTx = this.transactionStack_.pop();
		if (lastTx.index !== txIndex) throw new Error(`Committing a transaction but was not last to start one: ${txIndex}. Expected: ${lastTx.index}`);
		return !this.transactionStack_.length;
	}

	public async commit(txIndex: number): Promise<void> {
		this.log(`Commit transaction: ${txIndex}`);
		const isLastTransaction = this.finishTransaction(txIndex);
		if (isLastTransaction) {
			this.log(`Is last transaction - doing commit: ${txIndex}`);
			await this.activeTransaction_.commit();
			this.activeTransaction_ = null;
		}
	}

	// Only the function that started the transaction can rollback it. In
	// practice it works as expected even for nested transactions: If any of the
	// sub-function throws an error, it will propagate to the parent function,
	// which will rollback the connection.
	//
	// If a sub-function throws an error, but it's catched by the parent, we
	// also don't want the transaction to be rollbacked, because the errors are
	// essentially managed by the parent function. This is for example how
	// ItemModel::saveFromRawContent works because it catches any error and
	// saves them to an array, to be returned to the caller. So we don't want
	// any error to rollback everything.
	public async rollback(txIndex: number): Promise<void> {
		this.log(`Rollback transaction: ${txIndex}`);
		const isLastTransaction = this.finishTransaction(txIndex);
		if (isLastTransaction) {
			this.log(`Transaction is active - doing rollback: ${txIndex}`);
			await this.activeTransaction_.rollback();
			this.activeTransaction_ = null;
		}
	}

}
