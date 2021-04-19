import { ErrorNotFound } from '../../utils/errors';
import { Share, ShareType, User } from '../../db';
import { bodyFields, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

const router = new Router();

router.public = true;

router.post('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareModel = ctx.models.share();
	const share: Share = shareModel.fromApiInput(await bodyFields(ctx.req)) as Share;

	let shareToSave:Share = {};

	if (share.folder_id) {
		const folderItem = await ctx.models.item().loadByJopId(ctx.owner.id, share.folder_id);
		if (!folderItem) throw new ErrorNotFound(`No such folder: ${share.folder_id}`);

		shareToSave = {
			type: ShareType.JoplinRootFolder,
			item_id: folderItem.id,
			owner_id: ctx.owner.id,
		};
	} else {
		shareToSave = {
			type: share.type,
			item_id: share.item_id,
			owner_id: ctx.owner.id,
		};
	}

	await shareModel.checkIfAllowed(ctx.owner, AclAction.Create, shareToSave);
	
	return shareModel.save(shareToSave);
});

router.post('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const user: User = await bodyFields(ctx.req) as User;
	return ctx.models.shareUser().addByEmail(path.id, user.email);
});

router.get('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	// No authentication is necessary - anyone who knows the share ID is allowed
	// to access the file. It is essentially public.

	const shareModel = ctx.models.share();
	const share = await shareModel.load(path.id);
	if (!share || share.type !== ShareType.Link) throw new ErrorNotFound();
	return shareModel.toApiOutput(share);
});

export default router;
