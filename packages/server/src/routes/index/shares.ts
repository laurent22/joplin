import { SubPath, ResponseType, Response } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { File, Share } from '../../db';
import { FileViewerResponse } from '../../apps/joplin/Application';

async function renderFile(context: AppContext, file: File, share: Share): Promise<FileViewerResponse> {
	const joplinApp = await context.apps.joplin();

	if (await joplinApp.isItemFile(file)) {
		return joplinApp.renderFile(file, share, context.query);
	}

	return {
		body: file.content,
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

	const file = await fileModel.loadWithContent(share.file_id, { skipPermissionCheck: true });
	if (!file) throw new ErrorNotFound();


	const result = await renderFile(ctx, file, share);

	ctx.response.body = result.body;
	ctx.response.set('Content-Type', result.mime);
	ctx.response.set('Content-Length', result.size.toString());
	return new Response(ResponseType.KoaResponse, ctx.response);
});

export default router;
