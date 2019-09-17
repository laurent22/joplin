import { Session, User } from '../db';
import { checkPassword } from '../utils/auth';
import { ErrorForbidden } from '../utils/errors';
import SessionModel from '../models/SessionModel';
import UserModel from '../models/UserModel';

const { uuid } = require('lib/uuid.js');

export default class SessionController {

	async authenticate(email: string, password: string):Promise<Session> {
		const user:User = await UserModel.loadByEmail(email);
		if (!checkPassword(password, user.password)) throw new ErrorForbidden('Invalid username or password');
		const session:Session = { id: uuid.create(), user_id: user.id };
		const newSession:Session = await SessionModel.save(session, { isNew: true });
		return newSession;
	}

}
