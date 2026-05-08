import BaseModel from './BaseModel';
import { User, Session, Uuid } from '../services/database/types';
import { uuidgen } from '@joplin/lib/uuid';
import { ErrorForbidden } from '../utils/errors';
import { Hour } from '../utils/time';
import { isValidMFACode } from '../utils/crypto';
import { getIsMFAEnabled } from './utils/user';

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

	public async createApplicationSession(userId: string, applicationId: Uuid): Promise<Session> {
		return this.save({
			id: uuidgen(),
			user_id: userId,
			application_id: applicationId,
		}, { isNew: true });
	}

	public async authenticate(emailOrApplicationId: string, password: string, mfaCode?: string, recoveryCode?: string) {
		if (this.models().application().isApplicationId(emailOrApplicationId)) {
			return this.authenticateApplication(emailOrApplicationId, password);
		} else {
			return this.authenticateUser(emailOrApplicationId, password, mfaCode, recoveryCode);
		}
	}

	private async authenticateUser(email: string, password: string, mfaCode?: string, recoveryCode?: string) {
		const user = await this.models().user().login(email, password);
		if (!user) throw new ErrorForbidden('Invalid email or password', { details: { email } });

		if (getIsMFAEnabled(user)) {
			if (!mfaCode && !recoveryCode) throw new ErrorForbidden('Invalid authentication code', { details: { mfaCode } });

			if (mfaCode) {
				const isValidCode = await isValidMFACode(user.totp_secret, mfaCode);
				if (!isValidCode) throw new ErrorForbidden('Invalid authentication code', { details: { mfaCode } });
			} else if (recoveryCode) {
				await this.models().recoveryCode().verify(user.id, recoveryCode);
			}
		}
		return this.createUserSession(user.id);
	}

	public async authenticateApplication(id: string, password: string) {
		const result = await this.models().application().login(id, password);
		return this.createApplicationSession(result.user.id, result.application.id);
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

	public async deleteByApplicationId(applicationId: Uuid) {
		await this.db(this.tableName)
			.where('application_id', '=', applicationId)
			.delete();
	}

}
