import { Session } from '../../db';
import { ErrorForbidden } from '../../utils/errors';
import uuidgen from '../../utils/uuidgen';
import BaseController from '../BaseController';

export default class SessionController extends BaseController {

	public async authenticate(email: string, password: string): Promise<Session> {
		const userModel = this.models.user();
		const user = await userModel.login(email, password);
		if (!user) throw new ErrorForbidden('Invalid username or password');
		const session: Session = { id: uuidgen(), user_id: user.id };
		return this.models.session().save(session, { isNew: true });
	}

}
