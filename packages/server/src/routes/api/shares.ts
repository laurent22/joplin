import { ErrorNotFound } from '../../utils/errors';
import { Share } from '../../db';
import { bodyFields, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';

const router = new Router();

router.public = true;

router.post('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareModel = ctx.models.share({ userId: ctx.owner.id });
	const share: Share = shareModel.fromApiInput(await bodyFields(ctx.req)) as Share;
	return shareModel.add(share.type, share.file_id);
});

router.get('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	// No authentication is necessary - anyone who knows the share ID is allowed
	// to access the file. It is essentially public.

	const shareModel = ctx.models.share();
	const share = await shareModel.load(path.id);
	if (!share) throw new ErrorNotFound();
	return shareModel.toApiOutput(share);
});

export default router;
