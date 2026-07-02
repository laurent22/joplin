import { SubPath, ResponseType, Response, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { Item, Share, ShareType } from '../../services/database/types';
import { ModelType } from '@joplin/lib/BaseModel';
import { FileViewerResponse, renderItem as renderJoplinItem } from '../../utils/joplinUtils';
import safeUserContentResponse from '../../utils/safeUserContentResponse';

async function renderItem(context: AppContext, item: Item, share: Share): Promise<FileViewerResponse> {
	const isPublishedNote = item.jop_type === ModelType.Note && share.type === ShareType.Note;
	const isPublishedFolder = item.jop_type === ModelType.Folder && share.type === ShareType.PublishedFolder;
	if (isPublishedNote || isPublishedFolder) {
		return renderJoplinItem(share.owner_id, item, share, context.query);
	}

	return {
		body: item.content,
		mime: item.mime_type,
		size: item.content_size,
		filename: '',
	};
}

const router: Router = new Router(RouteType.Web);

router.public = true;

router.get('shares/:id', async (path: SubPath, ctx: AppContext) => {
	const shareModel = ctx.joplin.models.share();

	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();

	const user = await ctx.joplin.models.user().load(share.owner_id);
	if (!user.enabled) throw new ErrorForbidden('This account has been disabled');


	if (share.type !== ShareType.Note && share.type !== ShareType.PublishedFolder) throw new ErrorNotFound();

	if (ctx.query.note_id && share.type === ShareType.Note && !share.recursive) {
		const redirectUrl = await shareModel.linkedNoteShareUrl(share, ctx.query.note_id as string);
		if (redirectUrl) return redirect(ctx, redirectUrl);
		throw new ErrorForbidden('This linked note has not been published');
	}

	const itemModel = ctx.joplin.models.item();

	const item = await itemModel.loadWithContent(share.item_id);
	if (!item) throw new ErrorNotFound();

	const result = await renderItem(ctx, item, share);

	ctx.joplin.models.share().checkShareUrl(share, ctx.URL.origin);

	ctx.response.body = result.body;
	ctx.response.set('Content-Length', result.size.toString());

	// Note HTML is server-rendered, so it can be served as-is. Resource
	// attachments use user-controlled MIME/filename and must be sanitized.
	const isRenderedShareHtml = !ctx.query.resource_id && (
		item.jop_type === ModelType.Note ||
		item.jop_type === ModelType.Folder
	);
	if (isRenderedShareHtml) {
		ctx.response.set('Content-Type', result.mime);
	} else {
		const safe = safeUserContentResponse(result.mime, result.filename);
		ctx.response.set('Content-Type', safe.mime);
		ctx.response.set('Content-Disposition', safe.contentDisposition);
		ctx.response.set('Content-Security-Policy', safe.contentSecurityPolicy);
		ctx.response.set('X-Content-Type-Options', safe.xContentTypeOptions);
	}

	return new Response(ResponseType.KoaResponse, ctx.response);
}, RouteType.UserContent);

export default router;
