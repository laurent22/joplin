import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { Pagination } from '../../models/utils/pagination';
import { File } from '../../db';

export default class FileController extends BaseController {

	public async getIndex(sessionId: string, dirId: string, pagination: Pagination): Promise<View> {
		const owner = await this.initSession(sessionId);
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const parent: File = dirId ? await fileModel.entityFromItemId(dirId) : await fileModel.userRootFile();
		const paginatedFiles = await fileModel.childrens(parent.id, pagination);

		const view: View = defaultView('files', owner);
		view.content.paginatedFiles = paginatedFiles;
		return view;
	}

	// public async getOne(sessionId: string, isNew: boolean, userIdOrString: string | User = null, error: any = null): Promise<View> {
	// 	const owner = await this.initSession(sessionId);
	// 	const userModel = this.models.user({ userId: owner.id });

	// 	let user: User = {};

	// 	if (typeof userIdOrString === 'string') {
	// 		user = await userModel.load(userIdOrString as string);
	// 	} else {
	// 		user = userIdOrString as User;
	// 	}

	// 	const view: View = defaultView('user', owner);
	// 	view.content.user = user;
	// 	view.content.isNew = isNew;
	// 	view.content.buttonTitle = isNew ? 'Create user' : 'Update profile';
	// 	view.content.error = error;
	// 	view.content.postUrl = `${baseUrl()}/users${isNew ? '/new' : `/${user.id}`}`;
	// 	view.partials.push('errorBanner');

	// 	return view;
	// }

}
