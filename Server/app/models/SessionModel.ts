import BaseModel from './BaseModel';
import UserModel from './UserModel';
import { User, Session } from '../db';

export default class SessionModel extends BaseModel {

	tableName():string {
		return 'sessions';
	}

	async sessionUser(sessionId:string):Promise<User> {
		const session:Session = await this.load(sessionId);
		if (!session) return null;
		const userModel = new UserModel({ userId: session.user_id });
		return userModel.load(session.user_id);
	}

}
