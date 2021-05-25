import { Token, Uuid } from '../db';
import { ErrorForbidden } from '../utils/errors';
import uuidgen from '../utils/uuidgen';
import BaseModel from './BaseModel';

export default class TokenModel extends BaseModel<Token> {

	private tokenTtl_: number = 7 * 24 * 60 * 1000;

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
