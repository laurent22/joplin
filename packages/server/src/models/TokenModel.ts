import { Token, User, Uuid } from '../services/database/types';
import { ErrorForbidden, ErrorNotFound } from '../utils/errors';
import { uuidgen } from '../utils/uuid';
import BaseModel from './BaseModel';

// A token minted for one purpose must not be accepted for another - e.g. a CSRF
// token must not be usable to confirm an account or to reset a password. The
// purpose is a required argument throughout, so that every call site has to
// state which kind of token it means.
export enum TokenPurpose {
	Csrf = 'csrf',
	PasswordReset = 'password_reset',
	AccountConfirmation = 'account_confirmation',
	TeamInvitation = 'team_invitation',
	EmailChange = 'email_change',
}

export default class TokenModel extends BaseModel<Token> {

	private tokenTtl_: number = 7 * 24 * 60 * 60 * 1000;

	public get tableName(): string {
		return 'tokens';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async generate(userId: Uuid, purpose: TokenPurpose): Promise<string> {
		const token = await this.save({
			value: uuidgen(32),
			user_id: userId,
			purpose,
		});

		return token.value;
	}

	public async checkToken(userId: string, tokenValue: string, purpose: TokenPurpose): Promise<void> {
		if (!(await this.isValid(userId, tokenValue, purpose))) throw new ErrorForbidden('Invalid or expired token');
	}

	private async byUser(userId: string, tokenValue: string, purpose: TokenPurpose): Promise<Token> {
		return this
			.db(this.tableName)
			.select(['id'])
			.where('user_id', '=', userId)
			.where('value', '=', tokenValue)
			.where('purpose', '=', purpose)
			.first();
	}

	private async byToken(tokenValue: string): Promise<Token> {
		return this
			.db(this.tableName)
			.select(['user_id', 'value', 'purpose'])
			.where('value', '=', tokenValue)
			.first();
	}

	public async userFromToken(tokenValue: string, purpose: TokenPurpose): Promise<User> {
		const token = await this.byToken(tokenValue);
		if (!token) throw new ErrorNotFound(`No such token: ${tokenValue}`);
		if (token.purpose !== purpose) throw new ErrorNotFound(`No such token: ${tokenValue}`);
		const user = this.models().user().load(token.user_id);
		if (!user) throw new ErrorNotFound('No user associated with this token');
		return user;
	}

	public async isValid(userId: string, tokenValue: string, purpose: TokenPurpose): Promise<boolean> {
		const token = await this.byUser(userId, tokenValue, purpose);
		return !!token;
	}

	public async deleteExpiredTokens() {
		const cutOffDate = Date.now() - this.tokenTtl_;
		await this.db(this.tableName).where('created_time', '<', cutOffDate).delete();
	}

	public async deleteByValue(userId: Uuid, value: string, purpose: TokenPurpose) {
		const token = await this.byUser(userId, value, purpose);
		if (token) await this.delete(token.id);
	}

	public async deleteByUserAndPurpose(userId: Uuid, purpose: TokenPurpose) {
		await this.db(this.tableName).where('user_id', '=', userId).where('purpose', '=', purpose).delete();
	}

	public async allByUserId(userId: Uuid): Promise<Token[]> {
		return this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('user_id', '=', userId);
	}

}
