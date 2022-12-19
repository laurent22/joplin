import { SubPath, ResponseType, Response } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Item, Share } from '../../services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';
import { FileViewerResponse, renderItem as renderJoplinItem } from '../../utils/joplinUtils';
import { friendlySafeFilename } from '@joplin/lib/path-utils';

async function renderItem(context: AppContext, item: Item, share: Share): Promise<FileViewerResponse> {
	if (item.jop_type === ModelType.Note) {
		return renderJoplinItem(share.owner_id, item, share, context.query);
	}

	return {
		body: item.content,
		mime: item.mime_type,
		size: item.content_size,
		filename: '',
	};
}

function createContentDispositionHeader(filename: string) {
	const encoded = encodeURIComponent(friendlySafeFilename(filename, null, true));
	return `attachment; filename*=UTF-8''${encoded}; filename="${encoded}"`;
}

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const shareModel = ctx.joplin.models.share();

	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();

	const user = await ctx.joplin.models.user().load(share.owner_id);
	if (!user.enabled) throw new ErrorForbidden('This account has been disabled');

	const itemModel = ctx.joplin.models.item();

	const item = await itemModel.loadWithContent(share.item_id);
	if (!item) throw new ErrorNotFound();

	const result = await renderItem(ctx, item, share);

	ctx.joplin.models.share().checkShareUrl(share, ctx.URL.origin);

	ctx.response.body = result.body;
	ctx.response.set('Content-Type', result.mime);
	ctx.response.set('Content-Length', result.size.toString());
	if (result.filename) ctx.response.set('Content-disposition', createContentDispositionHeader(result.filename));
	return new Response(ResponseType.KoaResponse, ctx.response);
}, RouteType.UserContent);

export default router;
