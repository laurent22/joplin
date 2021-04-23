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

	const body = await bodyFields(ctx.req);

	if ('is_accepted' in body) {
		return shareUserModel.accept(shareUser.share_id, shareUser.user_id, !!body.is_accepted);
	} else {
		throw new ErrorBadRequest('Only setting is_accepted is supported');
	}
});

router.get('api/share_users', async (_path: SubPath, ctx: AppContext) => {
	return {
		items: await ctx.models.shareUser().byUserId(ctx.owner.id),
		has_more: false,
	}
});

export default router;
