import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';

const router = new Router();

router.patch('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	// TODO: check permissions
	const shareUserModel = ctx.models.shareUser({ userId: ctx.owner.id });
	const shareUser = await shareUserModel.load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	const body = await bodyFields(ctx.req);

	// TODO: Created LinkedFolder

	if ('is_accepted' in body) {
		return shareUserModel.accept(shareUser.share_id, shareUser.user_id, !!body.is_accepted);
	} else {
		throw new ErrorBadRequest('Only setting is_accepted is supported');
	}
});

export default router;
