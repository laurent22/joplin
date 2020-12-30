import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';

export default class HomeController extends BaseController {

	public async getIndex(sessionId: string): Promise<View> {
		await this.initSession(sessionId);
		return defaultView('home');
	}

}
