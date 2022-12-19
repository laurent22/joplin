import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { bodyFields } from '../../utils/requestUtils';
import { ErrorNotFound } from '../../utils/errors';
import { Notification } from '../../services/database/types';

const router = new Router(RouteType.Web);

router.patch('notifications/:id', async (path: SubPath, ctx: AppContext) => {
	const fields: Notification = await bodyFields(ctx.req);
	const notificationId = path.id;
	const model = ctx.joplin.models.notification();
	const existingNotification = await model.load(notificationId);
	if (!existingNotification) throw new ErrorNotFound();

	const toSave: Notification = {};
	if ('read' in fields) toSave.read = fields.read;
	if (!Object.keys(toSave).length) return;

	toSave.id = notificationId;
	await model.save(toSave);
});

export default router;
