import BaseModel from './BaseModel';
import { User, Session, Uuid } from '../services/database/types';
import uuidgen from '../utils/uuidgen';
import { ErrorForbidden } from '../utils/errors';
import { Hour } from '../utils/time';

export const defaultSessionTtl = 12 * Hour;

export default class SessionModel extends BaseModel<Session> {

	protected get tableName(): string {
		return 'sessions';
	}

	public async sessionUser(sessionId: string): Promise<User> {
		const session: Session = await this.load(sessionId);
		if (!session) return null;
		const userModel = this.models().user();
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
		if (!user) throw new ErrorForbidden('Invalid username or password', { details: { email } });
		return this.createUserSession(user.id);
	}

	public async logout(sessionId: string) {
		if (!sessionId) return;
		await this.delete(sessionId);
	}

	public async deleteByUserId(userId: Uuid, exceptSessionId: Uuid = '') {
		const query = this.db(this.tableName).where('user_id', '=', userId);
		if (exceptSessionId) void query.where('id', '!=', exceptSessionId);
		await query.delete();
	}

	public async deleteExpiredSessions() {
		const cutOffTime = Date.now() - defaultSessionTtl;
		await this.db(this.tableName).where('created_time', '<', cutOffTime).delete();
	}

}
