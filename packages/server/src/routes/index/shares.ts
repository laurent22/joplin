import { SubPath, ResponseType, Response } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { ErrorNotFound } from '../../utils/errors';
import { Item, Share } from '../../db';
import { FileViewerResponse } from '../../apps/joplin/Application';
import { ModelType } from '@joplin/lib/BaseModel';

async function renderItem(context: AppContext, item: Item, share: Share): Promise<FileViewerResponse> {
	if (item.jop_type === ModelType.Note) {
		return context.apps.joplin.renderItem(share.owner_id, item, share, context.query);
	}

	return {
		body: item.content,
		mime: item.mime_type,
		size: item.content_size,
	};
}

const router: Router = new Router();

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const shareModel = ctx.models.share();

	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();

	const itemModel = ctx.models.item();

	const item = await itemModel.loadWithContent(share.item_id);
	if (!item) throw new ErrorNotFound();

	const result = await renderItem(ctx, item, share);

	ctx.response.body = result.body;
	ctx.response.set('Content-Type', result.mime);
	ctx.response.set('Content-Length', result.size.toString());
	return new Response(ResponseType.KoaResponse, ctx.response);
});

export default router;
