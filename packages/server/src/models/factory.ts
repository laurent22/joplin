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

// So this is GOOD:

//    class FileController {
//        public async deleteFile(id:string) {
//            const fileModel = this.models.file();
//            await fileModel.delete(id);
//        }
//    }

// This is BAD:

//    class FileController {
//
//        private fileModel;
//
//        public constructor() {
//            // BAD - Don't keep and re-use a copy of it!
//            this.fileModel = this.models.file();
//        }
//
//        public async deleteFile(id:string) {
//            await this.fileModel.delete(id);
//        }
//    }

import { DbConnection } from '../db';
import ApiClientModel from './ApiClientModel';
import ItemModel from './ItemModel';
import UserModel from './UserModel';
import UserItemModel from './UserItemModel';
import SessionModel from './SessionModel';
import ChangeModel from './ChangeModel';
import NotificationModel from './NotificationModel';
import ShareModel from './ShareModel';
import EmailModel from './EmailModel';
import ItemResourceModel from './ItemResourceModel';
import ShareUserModel from './ShareUserModel';
import KeyValueModel from './KeyValueModel';
import TokenModel from './TokenModel';
import SubscriptionModel from './SubscriptionModel';
import UserFlagModel from './UserFlagModel';
import EventModel from './EventModel';
import { Config } from '../utils/types';
import LockModel from './LockModel';
import StorageModel from './StorageModel';
import UserDeletionModel from './UserDeletionModel';
import BackupItemModel from './BackupItemModel';
import TaskStateModel from './TaskStateModel';

export type NewModelFactoryHandler = (db: DbConnection)=> Models;

export class Models {

	private db_: DbConnection;
	private config_: Config;

	public constructor(db: DbConnection, config: Config) {
		this.db_ = db;
		this.config_ = config;

		this.newModelFactory = this.newModelFactory.bind(this);
	}

	private newModelFactory(db: DbConnection) {
		return new Models(db, this.config_);
	}

	public item() {
		return new ItemModel(this.db_, this.newModelFactory, this.config_);
	}

	public user() {
		return new UserModel(this.db_, this.newModelFactory, this.config_);
	}

	public email() {
		return new EmailModel(this.db_, this.newModelFactory, this.config_);
	}

	public userItem() {
		return new UserItemModel(this.db_, this.newModelFactory, this.config_);
	}

	public token() {
		return new TokenModel(this.db_, this.newModelFactory, this.config_);
	}

	public itemResource() {
		return new ItemResourceModel(this.db_, this.newModelFactory, this.config_);
	}

	public apiClient() {
		return new ApiClientModel(this.db_, this.newModelFactory, this.config_);
	}

	public session() {
		return new SessionModel(this.db_, this.newModelFactory, this.config_);
	}

	public change() {
		return new ChangeModel(this.db_, this.newModelFactory, this.config_);
	}

	public notification() {
		return new NotificationModel(this.db_, this.newModelFactory, this.config_);
	}

	public share() {
		return new ShareModel(this.db_, this.newModelFactory, this.config_);
	}

	public shareUser() {
		return new ShareUserModel(this.db_, this.newModelFactory, this.config_);
	}

	public keyValue() {
		return new KeyValueModel(this.db_, this.newModelFactory, this.config_);
	}

	public subscription() {
		return new SubscriptionModel(this.db_, this.newModelFactory, this.config_);
	}

	public userFlag() {
		return new UserFlagModel(this.db_, this.newModelFactory, this.config_);
	}

	public event() {
		return new EventModel(this.db_, this.newModelFactory, this.config_);
	}

	public lock() {
		return new LockModel(this.db_, this.newModelFactory, this.config_);
	}

	public storage() {
		return new StorageModel(this.db_, this.newModelFactory, this.config_);
	}

	public userDeletion() {
		return new UserDeletionModel(this.db_, this.newModelFactory, this.config_);
	}

	public backupItem() {
		return new BackupItemModel(this.db_, this.newModelFactory, this.config_);
	}

	public taskState() {
		return new TaskStateModel(this.db_, this.newModelFactory, this.config_);
	}

}

export default function newModelFactory(db: DbConnection, config: Config): Models {
	return new Models(db, config);
}
