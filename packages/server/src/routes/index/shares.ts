import { SubPath, ResponseType, Response, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Item, Share, ShareType } from '../../services/database/types';
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

	if (ctx.query.note_id && !share.recursive) {
		const noteItem = await ctx.joplin.models.item().loadByJopId(share.owner_id, ctx.query.note_id as string);
		if (!noteItem) throw new ErrorForbidden('This linked note has not been published');

		const noteShare = await shareModel.itemShare(ShareType.Note, noteItem.id);
		if (!noteShare) throw new ErrorForbidden('This linked note has not been published');

		return redirect(ctx, shareModel.shareUrl(noteShare.owner_id, noteShare.id));
	}

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
