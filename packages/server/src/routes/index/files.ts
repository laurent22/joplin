import { SubPath, respondWithFileContent, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext, HttpMethod } from '../../utils/types';
import { contextSessionId, formParse } from '../../utils/requestUtils';
import { ErrorNotFound } from '../../utils/errors';
import { File } from '../../db';
import { createPaginationLinks, filterPaginationQueryParams, pageMaxSize, Pagination, PaginationOrder, PaginationOrderDir, requestPaginationOrder, validatePagination } from '../../models/utils/pagination';
import { setQueryParameters } from '../../utils/urlUtils';
import config from '../../config';
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

const router = new Router();

router.alias(HttpMethod.GET, 'files', 'files/:id');

router.get('files/:id', async (path: SubPath, ctx: AppContext) => {
	const dirId = path.id;

	// Query parameters that should be appended to pagination-related URLs
	const baseUrlQuery = filterPaginationQueryParams(ctx.query);

	const pagination = makeFilePagination(ctx.query);
	const owner = ctx.owner;
	const fileModel = ctx.models.file({ userId: owner.id });
	const root = await fileModel.userRootFile();
	const parentTemp: File = dirId ? await fileModel.pathToFile(dirId, { returnFullEntity: false }) : root;
	const parent: File = await fileModel.load(parentTemp.id);
	const paginatedFiles = await fileModel.childrens(parent.id, pagination);
	const pageCount = Math.ceil((await fileModel.childrenCount(parent.id)) / pagination.limit);

	const parentBaseUrl = await fileModel.fileUrl(parent.id);
	const paginationLinks = createPaginationLinks(pagination.page, pageCount, setQueryParameters(parentBaseUrl, { ...baseUrlQuery, 'page': 'PAGE_NUMBER' }));

	async function fileToViewItem(file: File, fileFullPaths: Record<string, string>): Promise<any> {
		const filePath = fileFullPaths[file.id];

		let url = `${config().baseUrl}/files/${filePath}`;
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
	view.content.postUrl = `${config().baseUrl}/files`;
	view.content.parentId = parent.id;
	view.cssFiles = ['index/files'];
	view.partials.push('pagination');
	return view;
});

router.get('files/:id/content', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file({ userId: ctx.owner.id });
	let file: File = await fileModel.pathToFile(path.id, { returnFullEntity: false });
	file = await fileModel.loadWithContent(file.id);
	if (!file) throw new ErrorNotFound();
	return respondWithFileContent(ctx.response, file);
});

router.post('files', async (_path: SubPath, ctx: AppContext) => {
	const sessionId = contextSessionId(ctx);

	const body = await formParse(ctx.req);
	const fields = body.fields;
	const parentId = fields.parent_id;
	const user = await ctx.models.session().sessionUser(sessionId);

	if (fields.delete_all_button) {
		const fileModel = ctx.models.file({ userId: ctx.owner.id });
		const parent: File = await fileModel.pathToFile(parentId, { returnFullEntity: false });
		await fileModel.deleteChildren(parent.id);
	} else {
		throw new Error('Invalid form button');
	}

	return redirect(ctx, await ctx.models.file({ userId: user.id }).fileUrl(parentId, ctx.query));
});

export default router;
