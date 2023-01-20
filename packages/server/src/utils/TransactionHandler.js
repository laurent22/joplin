"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// This transaction handler allows abstracting away the complexity of managing nested transactions
// within models.
// Any method in a model can start a transaction and, if one is already started, it
// simply won't do anything. The last active transaction commits the results. If a rollback
// happens, the following calls to rollback will be a no-op.
// Set logEnabled_ to `true` to see what happens with nested transactions.
class TransactionHandler {
    constructor(db) {
        this.transactionStack_ = [];
        this.activeTransaction_ = null;
        this.transactionIndex_ = 0;
        this.logEnabled_ = false;
        this.db_ = null;
        this.db_ = db;
    }
    get db() {
        return this.db_;
    }
    setDb(db) {
        this.db_ = db;
    }
    log(s) {
        if (!this.logEnabled_)
            return;
        console.info(`TransactionHandler: ${s}`);
    }
    get activeTransaction() {
        return this.activeTransaction_;
    }
    get stackInfo() {
        const output = [];
        for (const t of this.transactionStack_) {
            output.push(`#${t.index}: ${t.name}: ${t.timestamp.toUTCString()}`);
        }
        return output.join('\n');
    }
    start(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const txIndex = ++this.transactionIndex_;
            this.log(`Starting transaction: ${txIndex}`);
            if (!this.transactionStack_.length) {
                if (this.activeTransaction_)
                    throw new Error('An active transaction was found when no transaction was in stack'); // Sanity check
                this.log(`Trying to acquire transaction: ${txIndex}`);
                this.activeTransaction_ = yield this.db.transaction();
                this.log(`Got transaction: ${txIndex}`);
            }
            this.transactionStack_.push({
                name,
                index: txIndex,
                timestamp: new Date(),
            });
            return txIndex;
        });
    }
    finishTransaction(txIndex) {
        if (!this.transactionStack_.length)
            throw new Error('Committing but no transaction was started');
        const lastTx = this.transactionStack_.pop();
        if (lastTx.index !== txIndex)
            throw new Error(`Committing a transaction but was not last to start one: ${txIndex}. Expected: ${lastTx.index}`);
        return !this.transactionStack_.length;
    }
    commit(txIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log(`Commit transaction: ${txIndex}`);
            const isLastTransaction = this.finishTransaction(txIndex);
            if (isLastTransaction) {
                this.log(`Is last transaction - doing commit: ${txIndex}`);
                yield this.activeTransaction_.commit();
                this.activeTransaction_ = null;
            }
        });
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
    rollback(txIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log(`Rollback transaction: ${txIndex}`);
            const isLastTransaction = this.finishTransaction(txIndex);
            if (isLastTransaction) {
                this.log(`Transaction is active - doing rollback: ${txIndex}`);
                yield this.activeTransaction_.rollback();
                this.activeTransaction_ = null;
            }
        });
    }
}
exports.default = TransactionHandler;
//# sourceMappingURL=TransactionHandler.js.map