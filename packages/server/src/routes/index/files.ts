import { SubPath, Route, respondWithFileContent, redirect } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorNotFound } from '../../utils/errors';
import { File } from '../../db';
import { createPaginationLinks, pageMaxSize, Pagination, PaginationOrder, PaginationOrderDir, requestPaginationOrder, validatePagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../../utils/urlUtils';
import { baseUrl } from '../../config';
import { formatDateTime } from '../../utils/time';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';

function makeFilePagination(query: any): Pagination {
	const limit = Number(query.limit) || pageMaxSize;
	const order: PaginationOrder[] = requestPaginationOrder(query, 'name', PaginationOrderDir.ASC);
	order.splice(0, 0, { by: 'is_directory', dir: PaginationOrderDir.DESC });
	const page: number = 'page' in query ? Number(query.page) : 1;

	const output: Pagination = { limit, order, page };
	validatePagination(output);
	return output;
}

const route: Route = {

	endPoints: {

		'GET': {

			'files': 'files/:id',

			'files/:id': async function(path: SubPath, ctx: AppContext) {
				const dirId = path.id;
				const query = ctx.query;

				// Query parameters that should be appended to pagination-related URLs
				const baseUrlQuery: any = {};
				if (query.limit) baseUrlQuery.limit = query.limit;
				if (query.order_by) baseUrlQuery.order_by = query.order_by;
				if (query.order_dir) baseUrlQuery.order_dir = query.order_dir;

				const pagination = makeFilePagination(query);
				const owner = ctx.owner;
				const fileModel = ctx.models.file({ userId: owner.id });
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
			},

			'files/:id/content': async function(path: SubPath, ctx: AppContext) {
				const fileModel = ctx.models.file({ userId: ctx.owner.id });
				let file: File = await fileModel.entityFromItemId(path.id);
				file = await fileModel.loadWithContent(file.id);
				if (!file) throw new ErrorNotFound();
				return respondWithFileContent(ctx.response, file);
			},
		},

		'POST': {

			'files': async function(_path: SubPath, ctx: AppContext) {
				const sessionId = contextSessionId(ctx);

				const body = await formParse(ctx.req);
				const fields = body.fields;
				const parentId = fields.parent_id;
				const user = await ctx.models.session().sessionUser(sessionId);

				if (fields.delete_all_button) {
					const fileModel = ctx.models.file({ userId: ctx.owner.id });
					const parent: File = await fileModel.entityFromItemId(parentId, { returnFullEntity: true });
					await fileModel.deleteChildren(parent.id);
				} else {
					throw new Error('Invalid form button');
				}

				return redirect(ctx, await ctx.models.file({ userId: user.id }).fileUrl(parentId, ctx.query));
			},
		},
	},

};

export default route;
