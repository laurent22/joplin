import { Session, User } from '../../db';
import { checkPassword } from '../../utils/auth';
import { ErrorForbidden } from '../../utils/errors';
import uuidgen from '../../utils/uuidgen';
import BaseController from '../BaseController';

export default class SessionController extends BaseController {

	public async authenticate(email: string, password: string): Promise<Session> {
		const userModel = this.models.user();
		const user: User = await userModel.loadByEmail(email);
		if (!user) throw new ErrorForbidden('Invalid username or password');
		if (!checkPassword(password, user.password)) throw new ErrorForbidden('Invalid username or password');
		const session: Session = { id: uuidgen(), user_id: user.id };
		const sessionModel = this.models.session();
		return sessionModel.save(session, { isNew: true });
	}

}
