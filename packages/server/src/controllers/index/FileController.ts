import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { Pagination, pageMaxSize, PaginationOrder, requestPaginationOrder, PaginationOrderDir, validatePagination } from '../../models/utils/pagination';
import { File } from '../../db';
import { baseUrl } from '../../config';
import { formatDateTime } from '../../utils/time';

export function makeFilePagination(query: any): Pagination {
	const limit = query.limit || pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query, 'name', PaginationOrderDir.ASC);
	order.splice(0, 0, { by: 'is_directory', dir: PaginationOrderDir.DESC });
	const page: number = 'page' in query ? query.page : 1;

	const output: Pagination = { limit, order, page };
	validatePagination(output);
	return output;
}

export default class FileController extends BaseController {

	public async getIndex(sessionId: string, dirId: string, pagination: Pagination): Promise<View> {
		const owner = await this.initSession(sessionId);
		const user = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: user.id });
		const parent: File = dirId ? await fileModel.entityFromItemId(dirId) : await fileModel.userRootFile();
		const paginatedFiles = await fileModel.childrens(parent.id, pagination);
		// const pageCount = Math.ceil((await fileModel.childrenCount(parent.id)) / pagination.limit);

		const files: any[] = [];

		for (const file of paginatedFiles.items) {
			const filePath = await fileModel.itemFullPath(file);
			files.push({
				name: file.name,
				url: `${baseUrl()}/files/${filePath}`,
				type: file.is_directory ? 'directory' : 'file',
				timestamp: formatDateTime(file.updated_time),
			});
		}

		const view: View = defaultView('files', owner);
		view.content.paginatedFiles = { ...paginatedFiles, items: files };
		view.cssFiles = ['index/files'];
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
