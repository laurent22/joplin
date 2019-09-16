import { Session, User, File } from '../db'
import { checkPassword } from "../utils/auth"
import { ErrorForbidden } from "../utils/errors"
import SessionModel from "../models/SessionModel"
import UserModel from "../models/UserModel"

const { uuid } = require('lib/uuid.js');

export default class FileController {

	async createFile(session:Session, user:User, file:File):Promise<File> {

		return file;
		// const user:User = await UserModel.loadByName(name);
		
		// const ok = checkPassword(password, user.password);

		// if (!ok) throw new ErrorForbidden();

		// const session:Session = { id: uuid.create(), user_id: user.id }
		// const newSession:Session = await SessionModel.save(session, { isNew: true });

		// return newSession;
	}

}