import * as Knex from 'knex';
import { DbConnection } from '../db';

// This transaction handler allows abstracting away the complexity of managing nested transactions
// within models.
// Any method in a model can start a transaction and, if one is already started, it
// simply won't do anything. The last active transaction commits the results. If a rollback
// happens, the following calls to rollback will be a no-op.
// Set logEnabled_ to `true` to see what happens with nested transactions.
export default class TransactionHandler {

	private transactionStack_: number[] = [];
	private activeTransaction_: Knex.Transaction = null;
	private transactionIndex_: number = 0;
	private logEnabled_: boolean = false;
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
		console.info(`TransactionHandler: ${s}`);
	}

	public get activeTransaction(): Knex.Transaction {
		return this.activeTransaction_;
	}

	public async start(): Promise<number> {
		const txIndex = ++this.transactionIndex_;
		this.log(`Starting transaction: ${txIndex}`);

		if (!this.transactionStack_.length) {
			if (this.activeTransaction_) throw new Error('An active transaction was found when no transaction was in stack'); // Sanity check
			this.log(`Trying to acquire transaction: ${txIndex}`);
			this.activeTransaction_ = await this.db.transaction();
			this.log(`Got transaction: ${txIndex}`);
		}

		this.transactionStack_.push(txIndex);
		return txIndex;
	}

	private finishTransaction(txIndex: number): boolean {
		if (!this.transactionStack_.length) throw new Error('Committing but no transaction was started');
		const lastTxIndex = this.transactionStack_.pop();
		if (lastTxIndex !== txIndex) throw new Error(`Committing a transaction but was not last to start one: ${txIndex}. Expected: ${lastTxIndex}`);
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

	public async rollback(txIndex: number): Promise<void> {
		this.log(`Rollback transaction: ${txIndex}`);
		this.finishTransaction(txIndex);
		if (this.activeTransaction_) {
			this.log(`Transaction is active - doing rollback: ${txIndex}`);
			await this.activeTransaction_.rollback();
			this.activeTransaction_ = null;
		}
	}

}
