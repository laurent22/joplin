import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { User } from '../../db';
import { Models } from '../../models/factory';
import UserController from '../api/UserController';

export default class ProfileController extends BaseController {

	private userController_: UserController;

	public constructor(models: Models, userController: UserController) {
		super(models);
		this.userController_ = userController;
	}

	public async getIndex(sessionId: string, user: User = null, error: any = null): Promise<View> {
		const owner = await this.initSession(sessionId);

		const view: View = defaultView('profile');
		view.content.user = user ? user : owner;
		view.content.error = error;
		view.partials.push('errorBanner');
		return view;
	}

	public async patchIndex(sessionId: string, user: User): Promise<void> {
		await this.userController_.patchUser(sessionId, user);
	}

}
