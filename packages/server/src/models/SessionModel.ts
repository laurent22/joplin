import BaseModel from './BaseModel';
import { User, Session } from '../db';
import uuidgen from '../utils/uuidgen';

export default class SessionModel extends BaseModel {

	protected get tableName(): string {
		return 'sessions';
	}

	public async sessionUser(sessionId: string): Promise<User> {
		const session: Session = await this.load(sessionId);
		if (!session) return null;
		const userModel = this.models().user({ userId: session.user_id });
		return userModel.load(session.user_id);
	}

	public async createUserSession(userId: string): Promise<Session> {
		return this.save({
			id: uuidgen(),
			user_id: userId,
		}, { isNew: true });
	}

}
