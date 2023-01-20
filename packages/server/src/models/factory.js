"use strict";
// Each method of this class returns a new model instance, which can be
// used to manipulate the database.
//
// These instances should be used within the current function, then
// **discarded**. The caller in particular should not keep a copy of the
// model and re-use it across multiple calls as doing so might cause issues
// with the way transactions are managed, especially when concurrency is
// involved.
//
// If a copy of the model is kept, the following could happen:
//
// - Async function1 calls some model function that initiates a transaction
// - Async function2, in parallel, calls a function that also initiates a
//   transaction.
//
// Because of this, the transaction stack in BaseModel will be out of
// order, and function2 might pop the transaction of function1 or
// vice-versa. Possibly also commit or rollback the transaction of the
// other function.
//
// For that reason, models should be used in a linear way, with each
// function call being awaited before starting the next one.
//
// If multiple parallel calls are needed, multiple models should be
// created, one for each "thread".
//
// Creating a model is cheap, or should be, so it is not an issue to create
// and destroy them frequently.
//
// Perhaps all this could be enforced in code, but not clear how.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Models = void 0;
const ApiClientModel_1 = require("./ApiClientModel");
const ItemModel_1 = require("./ItemModel");
const UserModel_1 = require("./UserModel");
const UserItemModel_1 = require("./UserItemModel");
const SessionModel_1 = require("./SessionModel");
const ChangeModel_1 = require("./ChangeModel");
const NotificationModel_1 = require("./NotificationModel");
const ShareModel_1 = require("./ShareModel");
const EmailModel_1 = require("./EmailModel");
const ItemResourceModel_1 = require("./ItemResourceModel");
const ShareUserModel_1 = require("./ShareUserModel");
const KeyValueModel_1 = require("./KeyValueModel");
const TokenModel_1 = require("./TokenModel");
const SubscriptionModel_1 = require("./SubscriptionModel");
const UserFlagModel_1 = require("./UserFlagModel");
const EventModel_1 = require("./EventModel");
const LockModel_1 = require("./LockModel");
const StorageModel_1 = require("./StorageModel");
const UserDeletionModel_1 = require("./UserDeletionModel");
const BackupItemModel_1 = require("./BackupItemModel");
const TaskStateModel_1 = require("./TaskStateModel");
class Models {
    constructor(db, config) {
        this.db_ = db;
        this.config_ = config;
        this.newModelFactory = this.newModelFactory.bind(this); // bind creates a new function that is bound to a certain object.
        // here, we are making sure that "this" never changes context, but  instead remains "bound" to the current "Models"  object
    }
    newModelFactory(db) {
        // so we have a class called models which has a method that can create other models
        return new Models(db, this.config_);
    }
    item() {
        return new ItemModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    user() {
        return new UserModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    email() {
        return new EmailModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    userItem() {
        return new UserItemModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    token() {
        return new TokenModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    itemResource() {
        return new ItemResourceModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    apiClient() {
        return new ApiClientModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    session() {
        return new SessionModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    change() {
        return new ChangeModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    notification() {
        return new NotificationModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    share() {
        return new ShareModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    shareUser() {
        return new ShareUserModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    keyValue() {
        return new KeyValueModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    subscription() {
        return new SubscriptionModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    userFlag() {
        return new UserFlagModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    event() {
        return new EventModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    lock() {
        return new LockModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    storage() {
        return new StorageModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    userDeletion() {
        return new UserDeletionModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    backupItem() {
        return new BackupItemModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
    taskState() {
        return new TaskStateModel_1.default(this.db_, this.newModelFactory, this.config_);
    }
}
exports.Models = Models;
function newModelFactory(db, config) {
    return new Models(db, config);
}
exports.default = newModelFactory;
//# sourceMappingURL=factory.js.map