import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { User } from '../../db';

export default class ProfileController extends BaseController {

	public async getIndex(sessionId: string, user: User = null, error: any = null): Promise<View> {
		const owner = await this.initSession(sessionId);

		const view: View = defaultView('profile');
		view.content.user = user ? user : owner;
		view.content.error = error;
		view.partials.push('errorBanner');
		return view;
	}

}
