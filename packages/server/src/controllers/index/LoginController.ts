import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';

export default class LoginController extends BaseController {

	public async getIndex(error: any = null): Promise<View> {
		const view = defaultView('login');
		view.content.error = error;
		view.partials = ['errorBanner'];
		return view;
	}

}
