import { Token, Uuid } from '../db';
import uuidgen from '../utils/uuidgen';
import BaseModel from './BaseModel';

export default class TokenModel extends BaseModel<Token> {

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

	public async isValid(userId: string, tokenValue: string): Promise<boolean> {
		const token = await this
			.db(this.tableName)
			.select(['id'])
			.where('user_id', '=', userId)
			.where('value', '=', tokenValue)
			.first();

		return !!token;
	}

}
