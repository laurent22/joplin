import BaseModel from './BaseModel';
import UserModel from './UserModel';
import { User, Session } from '../db';

export default class SessionModel extends BaseModel {

	static tableName():string {
		return 'sessions';
	}

	static async sessionUser(sessionId:string):Promise<User> {
		const session:Session = await this.load(sessionId);
		if (!session) return null;
		return UserModel.load(session.user_id);
	}

}
