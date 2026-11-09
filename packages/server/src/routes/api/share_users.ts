import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';
import { ShareUserStatus } from '../../services/database/types';
import { confirmEmailMessage, needsEmailConfirmation } from '../../models/ShareUserModel';

const router = new Router(RouteType.Api);

router.patch('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUserModel = ctx.joplin.models.shareUser();
	const shareUser = await shareUserModel.load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await shareUserModel.checkIfAllowed(ctx.joplin.owner, AclAction.Update, shareUser);

	const body = await bodyFields<{ status?: number }>(ctx.req);

	if ('status' in body) {
		// Converted, so that a value such as "1" cannot get past the checks below and in setStatus()
		const status = Number(body.status);
		if (status !== ShareUserStatus.Accepted && status !== ShareUserStatus.Rejected) throw new ErrorBadRequest(`Invalid status: ${body.status}`);

		// Otherwise notebooks shared with an address would go to whoever registered it first
		if (status === ShareUserStatus.Accepted && needsEmailConfirmation(ctx.joplin.owner)) throw new ErrorForbidden(confirmEmailMessage('accepting a shared notebook'));
		return shareUserModel.setStatus(shareUser.share_id, shareUser.user_id, status);
	} else {
		throw new ErrorBadRequest('Only setting status is supported');
	}
});

router.del('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUser = await ctx.joplin.models.shareUser().load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await ctx.joplin.models.shareUser().checkIfAllowed(ctx.joplin.owner, AclAction.Delete, shareUser);
	await ctx.joplin.models.shareUser().delete(shareUser.id);
});

router.get('api/share_users', async (_path: SubPath, ctx: AppContext) => {
	const shareUsers = await ctx.joplin.models.shareUser().byUserId(ctx.joplin.owner.id);

	const items: Record<string, unknown>[] = [];
	for (const su of shareUsers) {
		const share = await ctx.joplin.models.share().load(su.share_id);
		const sharer = await ctx.joplin.models.user().load(share.owner_id);
		// They cannot be accepted (see ShareUserModel.setStatus)
		if (su.status === ShareUserStatus.Waiting && !sharer.enabled) continue;

		items.push({
			id: su.id,
			status: su.status,
			master_key: su.master_key,
			can_read: 1, // In Joplin Server, all shares are always readable and writable
			can_write: 1,
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
