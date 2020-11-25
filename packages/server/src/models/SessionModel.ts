import BaseModel from './BaseModel';
import { User, Session } from '../db';

export default class SessionModel extends BaseModel {

	get tableName(): string {
		return 'sessions';
	}

	async sessionUser(sessionId: string): Promise<User> {
		const session: Session = await this.load(sessionId);
		if (!session) return null;
		const userModel = this.models.user({ userId: session.user_id });
		return userModel.load(session.user_id);
	}

}
