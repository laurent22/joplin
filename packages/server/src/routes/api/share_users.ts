import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

const router = new Router();

router.patch('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUserModel = ctx.models.shareUser();
	const shareUser = await shareUserModel.load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await shareUserModel.checkIfAllowed(ctx.owner, AclAction.Update, shareUser);

	const body = await bodyFields<any>(ctx.req);

	if ('status' in body) {
		return shareUserModel.setStatus(shareUser.share_id, shareUser.user_id, body.status);
	} else {
		throw new ErrorBadRequest('Only setting status is supported');
	}
});

router.del('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUser = await ctx.models.shareUser().load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await ctx.models.shareUser().checkIfAllowed(ctx.owner, AclAction.Delete, shareUser);
	await ctx.models.shareUser().delete(shareUser.id);
});

router.get('api/share_users', async (_path: SubPath, ctx: AppContext) => {
	const shareUsers = await ctx.models.shareUser().byUserId(ctx.owner.id);

	const items: any[] = [];
	for (const su of shareUsers) {
		const share = await ctx.models.share().load(su.share_id);
		const sharer = await ctx.models.user().load(share.owner_id);

		items.push({
			id: su.id,
			status: su.status,
			share: {
				id: share.id,
				folder_id: share.folder_id,
				user: {
					full_name: sharer.full_name,
					email: sharer.email,
				},
			},
		});
	}

	return {
		items: items,
		has_more: false,
	};
});

export default router;
