import BaseModel from './BaseModel';
import { User, Session } from '../db';
import uuidgen from '../utils/uuidgen';
import { ErrorForbidden } from '../utils/errors';

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

	public async authenticate(email: string, password: string): Promise<Session> {
		const user = await this.models().user().login(email, password);
		if (!user) throw new ErrorForbidden('Invalid username or password');
		return this.createUserSession(user.id);
	}

	public async logout(sessionId: string) {
		if (!sessionId) return;
		await this.delete(sessionId);
	}

}
