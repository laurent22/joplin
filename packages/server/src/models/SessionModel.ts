import BaseModel from './BaseModel';
import { User, Session, Uuid } from '../services/database/types';
import { uuidgen } from '../utils/uuid';
import { ErrorCode, ErrorForbidden, ErrorTooManyRequests } from '../utils/errors';
import { Hour } from '../utils/time';
import { isValidMFACode } from '../utils/crypto';
import { getIsMFAEnabled } from './utils/user';
import { Services } from '../services/types';
import { limiterLoginAccountBruteForce } from '../utils/request/limiterAccountBruteForce';

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

	public async authenticate(emailOrApplicationId: string, password: string, services: Services, mfaCode?: string, recoveryCode?: string) {
		if (this.models().application().isApplicationId(emailOrApplicationId)) {
			return this.authenticateApplication(emailOrApplicationId, password);
		} else {
			return this.authenticateUser(emailOrApplicationId, password, services, mfaCode, recoveryCode);
		}
	}

	private async authenticateUser(email: string, password: string, services: Services, mfaCode?: string, recoveryCode?: string) {
		// Counted per account rather than per IP: the request-rate limiter on
		// the routes only sees one address at a time, so it cannot stop an
		// attacker who either spreads attempts across addresses or paces them
		// below the limit. Anyone who knows the email can block the account
		// this way, so an attempt with an MFA or recovery code still goes
		// through, and only succeeds with the password and a valid code.
		return limiterLoginAccountBruteForce.run(
			email,
			blockedError => this.checkUserCredentials(email, password, services, mfaCode, recoveryCode, blockedError),
			{ canBypassBlock: !!(mfaCode || recoveryCode) },
		);
	}

	// When `blockedError` is set, the account is blocked, and any failure is reported with it, so that an attempt on a
	// blocked account does not tell whether the password was right.
	private async checkUserCredentials(email: string, password: string, services: Services, mfaCode: string, recoveryCode: string, blockedError: ErrorTooManyRequests | null) {
		// Only rejected credentials are counted: a database or LDAP error is not a guess, and neither is a correct
		// password sent without an MFA code (the API never sends one)
		const user = await this.models().user().login(email, password, services);
		if (!user) {
			await limiterLoginAccountBruteForce.onFailure(email, `password:${password}`);
			throw blockedError || new ErrorForbidden('Invalid email or password', { details: { email } });
		}

		if (getIsMFAEnabled(user)) {
			if (!mfaCode && !recoveryCode) throw new ErrorForbidden('Invalid authentication code', { details: { mfaCode }, code: ErrorCode.MfaCodeRequired });
			if (blockedError && !(await limiterLoginAccountBruteForce.canTrySecondFactor(email))) throw blockedError;

			if (mfaCode) {
				if (!(await isValidMFACode(user.totp_secret, mfaCode))) {
					await limiterLoginAccountBruteForce.onFailure(email, `mfa:${mfaCode}`, { isSecondFactor: true, countRepeats: true });
					throw blockedError || new ErrorForbidden('Invalid authentication code', { details: { mfaCode } });
				}
			} else {
				try {
					await this.models().recoveryCode().verify(user.id, recoveryCode);
				} catch (error) {
					if (!(error instanceof ErrorForbidden)) throw error;
					await limiterLoginAccountBruteForce.onFailure(email, `recovery:${recoveryCode}`, { isSecondFactor: true });
					throw blockedError || error;
				}
			}
		} else if (blockedError) {
			throw blockedError;
		}

		await limiterLoginAccountBruteForce.onSuccess(email);
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
