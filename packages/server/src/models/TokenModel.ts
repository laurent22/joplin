import { Token, User, Uuid } from '../services/database/types';
import { ErrorForbidden, ErrorNotFound } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import BaseModel from './BaseModel';

export default class TokenModel extends BaseModel<Token> {

	private tokenTtl_: number = 7 * 24 * 60 * 60 * 1000;

	public get tableName(): string {
		return 'tokens';
	}

	protected hasUuid(): boolean {
		return false;
	}

	public async generate(userId: Uuid): Promise<string> {
		const token = await this.save({
			value: uuidgen(32),
			user_id: userId,
		});

		return token.value;
	}

	public async checkToken(userId: string, tokenValue: string): Promise<void> {
		if (!(await this.isValid(userId, tokenValue))) throw new ErrorForbidden('Invalid or expired token');
	}

	private async byUser(userId: string, tokenValue: string): Promise<Token> {
		return this
			.db(this.tableName)
			.select(['id'])
			.where('user_id', '=', userId)
			.where('value', '=', tokenValue)
			.first();
	}

	private async byToken(tokenValue: string): Promise<Token> {
		return this
			.db(this.tableName)
			.select(['user_id', 'value'])
			.where('value', '=', tokenValue)
			.first();
	}

	public async userFromToken(tokenValue: string): Promise<User> {
		const token = await this.byToken(tokenValue);
		if (!token) throw new ErrorNotFound(`No such token: ${tokenValue}`);
		const user = this.models().user().load(token.user_id);
		if (!user) throw new ErrorNotFound('No user associated with this token');
		return user;
	}

	public async isValid(userId: string, tokenValue: string): Promise<boolean> {
		const token = await this.byUser(userId, tokenValue);
		return !!token;
	}

	public async deleteExpiredTokens() {
		const cutOffDate = Date.now() - this.tokenTtl_;
		await this.db(this.tableName).where('created_time', '<', cutOffDate).delete();
	}

	public async deleteByValue(userId: Uuid, value: string) {
		const token = await this.byUser(userId, value);
		if (token) await this.delete(token.id);
	}

	public async allByUserId(userId: Uuid): Promise<Token[]> {
		return this
			.db(this.tableName)
			.select(this.defaultFields)
			.where('user_id', '=', userId);
	}

}
