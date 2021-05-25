import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { Share, ShareType } from '../../db';
import { bodyFields, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

interface ShareApiInput extends Share {
	folder_id?: string;
	note_id?: string;
}

const router = new Router(RouteType.Api);

router.public = true;

router.post('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareModel = ctx.models.share();
	const fields = await bodyFields<any>(ctx.req);
	const shareInput: ShareApiInput = shareModel.fromApiInput(fields) as ShareApiInput;
	if (fields.folder_id) shareInput.folder_id = fields.folder_id;
	if (fields.note_id) shareInput.note_id = fields.note_id;

	// - The API end point should only expose two ways of sharing:
	//     - By folder_id (JoplinRootFolder)
	//     - By note_id (Link)
	// - Additionally, the App method is available, but not exposed via the API.

	if (shareInput.folder_id) {
		return ctx.models.share().shareFolder(ctx.owner, shareInput.folder_id);
	} else if (shareInput.note_id) {
		return ctx.models.share().shareNote(ctx.owner, shareInput.note_id);
	} else {
		throw new ErrorBadRequest('Either folder_id or note_id must be provided');
	}
});

router.post('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	interface UserInput {
		email: string;
	}

	const fields = await bodyFields(ctx.req) as UserInput;
	const user = await ctx.models.user().loadByEmail(fields.email);
	if (!user) throw new ErrorNotFound('User not found');

	const shareId = path.id;

	await ctx.models.shareUser().checkIfAllowed(ctx.owner, AclAction.Create, {
		share_id: shareId,
		user_id: user.id,
	});

	return ctx.models.shareUser().addByEmail(shareId, user.email);
});

router.get('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareId = path.id;
	const share = await ctx.models.share().load(shareId);
	await ctx.models.share().checkIfAllowed(ctx.owner, AclAction.Read, share);

	const shareUsers = await ctx.models.shareUser().byShareId(shareId, null);
	const users = await ctx.models.user().loadByIds(shareUsers.map(su => su.user_id));

	const items = shareUsers.map(su => {
		const user = users.find(u => u.id === su.user_id);

		return {
			id: su.id,
			status: su.status,
			user: {
				id: user.id,
				email: user.email,
			},
		};
	});

	return {
		items,
		has_more: false,
	};
});

router.get('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	const shareModel = ctx.models.share();
	const share = await shareModel.load(path.id);

	if (share && share.type === ShareType.Note) {
		// No authentication is necessary - anyone who knows the share ID is allowed
		// to access the file. It is essentially public.
		return shareModel.toApiOutput(share);
	}

	throw new ErrorNotFound();
});

router.get('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const items = ctx.models.share().toApiOutput(await ctx.models.share().sharesByUser(ctx.owner.id)) as Share[];
	// Fake paginated results so that it can be added later on, if needed.
	return {
		items: items.map(i => {
			return {
				...i,
				user: {
					id: i.owner_id,
				},
			};
		}),
		has_more: false,
	};
});

router.del('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const share = await ctx.models.share().load(path.id);
	await ctx.models.share().checkIfAllowed(ctx.owner, AclAction.Delete, share);
	await ctx.models.share().delete(share.id);
});

export default router;
