import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { User } from '../../db';
import { baseUrl } from '../../config';

export default class UserController extends BaseController {

	public async getIndex(sessionId: string): Promise<View> {
		const owner = await this.initSession(sessionId, true);
		const userModel = this.models.user({ userId: owner.id });
		const users = await userModel.all();

		const view: View = defaultView('users');
		view.content.users = users;
		return view;
	}

	public async getOne(sessionId: string, isNew: boolean, userIdOrString: string | User = null, error: any = null): Promise<View> {
		const owner = await this.initSession(sessionId);
		const userModel = this.models.user({ userId: owner.id });

		let user: User = {};

		if (typeof userIdOrString === 'string') {
			user = await userModel.load(userIdOrString as string);
		} else {
			user = userIdOrString as User;
		}

		const view: View = defaultView('user');
		view.content.user = user;
		view.content.isNew = isNew;
		view.content.buttonTitle = isNew ? 'Create user' : 'Update profile';
		view.content.error = error;
		view.content.postUrl = `${baseUrl()}/users${isNew ? '/new' : `/${user.id}`}`;
		view.partials.push('errorBanner');

		return view;
	}

}
