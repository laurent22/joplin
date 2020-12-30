import BaseController from '../BaseController';
import { View } from '../../services/MustacheService';
import defaultView from '../../utils/defaultView';
import { Pagination, pageMaxSize, PaginationOrder, requestPaginationOrder, PaginationOrderDir, validatePagination, createPaginationLinks } from '../../models/utils/pagination';
import { File } from '../../db';
import { baseUrl } from '../../config';
import { formatDateTime } from '../../utils/time';
import { setQueryParameters } from '../../utils/urlUtils';

export function makeFilePagination(query: any): Pagination {
	const limit = Number(query.limit) || pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query, 'name', PaginationOrderDir.ASC);
	order.splice(0, 0, { by: 'is_directory', dir: PaginationOrderDir.DESC });
	const page: number = 'page' in query ? Number(query.page) : 1;

	const output: Pagination = { limit, order, page };
	validatePagination(output);
	return output;
}

export default class FileController extends BaseController {

	public async getIndex(sessionId: string, dirId: string, query: any): Promise<View> {
		// Query parameters that should be appended to pagination-related URLs
		const baseUrlQuery: any = {};
		if (query.limit) baseUrlQuery.limit = query.limit;
		if (query.order_by) baseUrlQuery.order_by = query.order_by;
		if (query.order_dir) baseUrlQuery.order_dir = query.order_dir;

		const pagination = makeFilePagination(query);
		const owner = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: owner.id });
		const root = await fileModel.userRootFile();
		const parentTemp: File = dirId ? await fileModel.entityFromItemId(dirId) : root;
		const parent: File = await fileModel.load(parentTemp.id);
		const paginatedFiles = await fileModel.childrens(parent.id, pagination);
		const pageCount = Math.ceil((await fileModel.childrenCount(parent.id)) / pagination.limit);

		const parentBaseUrl = await fileModel.fileUrl(parent.id);
		const paginationLinks = createPaginationLinks(pagination.page, pageCount, setQueryParameters(parentBaseUrl, { ...baseUrlQuery, 'page': 'PAGE_NUMBER' }));

		async function fileToViewItem(file: File, fileFullPaths: Record<string, string>): Promise<any> {
			const filePath = fileFullPaths[file.id];

			let url = `${baseUrl()}/files/${filePath}`;
			if (!file.is_directory) {
				url += '/content';
			} else {
				url = setQueryParameters(url, baseUrlQuery);
			}

			return {
				name: file.name,
				url,
				type: file.is_directory ? 'directory' : 'file',
				icon: file.is_directory ? 'far fa-folder' : 'far fa-file',
				timestamp: formatDateTime(file.updated_time),
				mime: !file.is_directory ? (file.mime_type || 'binary') : '',
			};
		}

		const files: any[] = [];

		const fileFullPaths = await fileModel.itemFullPaths(paginatedFiles.items);

		if (parent.id !== root.id) {
			const p = await fileModel.load(parent.parent_id);
			files.push({
				...await fileToViewItem(p, await fileModel.itemFullPaths([p])),
				icon: 'fas fa-arrow-left',
				name: '..',
			});
		}

		for (const file of paginatedFiles.items) {
			files.push(await fileToViewItem(file, fileFullPaths));
		}

		const view: View = defaultView('files');
		view.content.paginatedFiles = { ...paginatedFiles, items: files };
		view.content.paginationLinks = paginationLinks;
		view.content.postUrl = `${baseUrl()}/files`;
		view.content.parentId = parent.id;
		view.cssFiles = ['index/files'];
		view.partials.push('pagination');


		return view;
	}

	public async deleteAll(sessionId: string, dirId: string): Promise<void> {
		const owner = await this.initSession(sessionId);
		const fileModel = this.models.file({ userId: owner.id });
		const parent: File = await fileModel.entityFromItemId(dirId, { returnFullEntity: true });
		await fileModel.deleteChildren(parent.id);
	}

}
