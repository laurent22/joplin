import db, { Session, User } from '../db'
import { checkPassword } from "../auth"
import { ErrorForbidden } from "../errors"

export default class SessionController {

	async authenticate(name: string, password: string):Promise<Session> {
		const user = await db('users').where({
			name: name,
		}).first('id', 'password');
		
		const ok = checkPassword(password, user.password);

		if (!ok) throw new ErrorForbidden();

		await db('sessions').insert({id: 'testing', user_id: user.id, created_time: Date.now(), updated_time: Date.now()})

		return db('sessions').where({ id: 'testing' }).first();
	}

}