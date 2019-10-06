import BaseController from './BaseController';
import mustacheService from '../services/MustacheService';
import { ErrorNotFound } from '../utils/errors';
import ApiClientModel from '../models/ApiClientModel';

export default class OAuthController extends BaseController {

	async getAuthorize(query:any):Promise<string> {
		const clientModel = new ApiClientModel();
		const client = await clientModel.load(query.client_id);
		if (!client) throw new ErrorNotFound(`client_id missing or invalid client ID: ${query.client_id}`);

		return mustacheService.render('oauth2/authorize', {
			response_type: query.response_type,
			client: client,
		}, {
			cssFiles: ['oauth2/authorize'],
		});
	}

}
