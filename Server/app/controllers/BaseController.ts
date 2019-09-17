import { User } from '../db';
import { ErrorForbidden } from '../utils/errors';
import SessionModel from '../models/SessionModel';

export default abstract class BaseController {

	async initSession(sessionId:string, mustBeAdmin:boolean = false):Promise<User> {
		const sessionModel = new SessionModel();
		const user:User = await sessionModel.sessionUser(sessionId);
		if (!user) throw new ErrorForbidden('Invalid session ID: ' + sessionId);
		if (!user.is_admin && mustBeAdmin) throw new ErrorForbidden('Non-admin user is not allowed');
		return user;
	}

}
