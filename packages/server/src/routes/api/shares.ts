import { ErrorNotFound } from '../../utils/errors';
import { Share, ShareType, User } from '../../db';
import { bodyFields, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

interface ShareApiInput extends Share {
	folder_id?: string;
	item_name?: string;
}

const router = new Router();

router.public = true;

router.post('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareModel = ctx.models.share();
	const fields = await bodyFields(ctx.req);
	const shareInput: ShareApiInput = shareModel.fromApiInput(fields) as ShareApiInput;
	if (fields.folder_id) shareInput.folder_id = fields.folder_id;
	if (fields.item_name) shareInput.item_name = fields.item_name;

	let shareToSave: Share = {};

	if (shareInput.folder_id) {
		const folderItem = await ctx.models.item().loadByJopId(ctx.owner.id, shareInput.folder_id);
		if (!folderItem) throw new ErrorNotFound(`No such folder: ${shareInput.folder_id}`);

		shareToSave = {
			type: ShareType.JoplinRootFolder,
			item_id: folderItem.id,
			owner_id: ctx.owner.id,
		};
	} else {
		let itemId = null;

		if (shareInput.item_name) {
			const item = await ctx.models.item().loadByName(ctx.owner.id, shareInput.item_name);
			if (!item) throw new ErrorNotFound(`No such item: ${shareInput.item_name}`);
			itemId = item.id;
		} else {
			itemId = shareInput.item_id;
		}

		shareToSave = {
			type: shareInput.type,
			item_id: itemId,
			owner_id: ctx.owner.id,
		};
	}

	await shareModel.checkIfAllowed(ctx.owner, AclAction.Create, shareToSave);

	return shareModel.save(shareToSave);
});

router.post('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const user: User = await bodyFields(ctx.req) as User;
	if (!user) throw new ErrorNotFound('User not found');

	await ctx.models.shareUser().checkIfAllowed(ctx.owner, AclAction.Create, {
		share_id: path.id,
		user_id: user.id,
	});

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
