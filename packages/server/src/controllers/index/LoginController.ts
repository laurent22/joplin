import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';

export default class LoginController extends BaseController {

	public async getIndex(error: any = null): Promise<View> {
		return {
			name: 'login',
			path: 'index/login',
			content: {
				error,
			},
			cssFiles: ['index/login'],
		};
	}

}
