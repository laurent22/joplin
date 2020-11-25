import { DbConnection } from '../db';
import ApiClientModel from './ApiClientModel';
import { ModelOptions } from './BaseModel';
import FileModel from './FileModel';
import UserModel from './UserModel';
import PermissionModel from './PermissionModel';
import SessionModel from './SessionModel';

export class Models {

	private db_: DbConnection;

	public constructor(db: DbConnection) {
		this.db_ = db;
	}

	file(options: ModelOptions = null) {
		return new FileModel(this.db_, options);
	}

	user(options: ModelOptions = null) {
		return new UserModel(this.db_, options);
	}

	apiClient(options: ModelOptions = null) {
		return new ApiClientModel(this.db_, options);
	}

	permission(options: ModelOptions = null) {
		return new PermissionModel(this.db_, options);
	}

	session(options: ModelOptions = null) {
		return new SessionModel(this.db_, options);
	}
}

export default function(db: DbConnection): Models {
	return new Models(db);
}
