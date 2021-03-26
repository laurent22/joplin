import { SubPath, ResponseType, Response } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { Share } from '../../db';
import { FileViewerResponse } from '../../apps/joplin/Application';
import { FileWithContent } from '../../models/FileModel';

async function renderFile(context: AppContext, fileWithContent: FileWithContent, share: Share): Promise<FileViewerResponse> {
	const joplinApp = await context.apps.joplin();

	if (await joplinApp.fileToJoplinItem(fileWithContent)) {
		return joplinApp.renderFile(fileWithContent, share, context.query);
	}

	const { file, content } = fileWithContent;

	return {
		body: content,
		mime: file.mime_type,
		size: file.size,
	};
}

const router: Router = new Router();

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const fileModel = ctx.models.file();
	const shareModel = ctx.models.share();

	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();

	const fileWithContent = await fileModel.loadWithContent(share.file_id, { skipPermissionCheck: true });
	if (!fileWithContent) throw new ErrorNotFound();

	const result = await renderFile(ctx, fileWithContent, share);

	ctx.response.body = result.body;
	ctx.response.set('Content-Type', result.mime);
	ctx.response.set('Content-Length', result.size.toString());
	return new Response(ResponseType.KoaResponse, ctx.response);
});

export default router;
