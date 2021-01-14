import { SubPath, Route } from '../../utils/routeUtils';
import { AppContext } from '../../utils/types';
import { bodyFields, contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed, ErrorNotFound } from '../../utils/errors';
import { Notification } from '../../db';

const route: Route = {

	exec: async function(path: SubPath, ctx: AppContext) {
		contextSessionId(ctx);

		if (path.id && ctx.method === 'PATCH') {
			const fields: Notification = await bodyFields(ctx.req);
			const notificationId = path.id;
			const model = ctx.models.notification({ userId: ctx.owner.id });
			const existingNotification = await model.load(notificationId);
			if (!existingNotification) throw new ErrorNotFound();

			const toSave: Notification = {};
			if ('read' in fields) toSave.read = fields.read;
			if (!Object.keys(toSave).length) return;

			toSave.id = notificationId;
			await model.save(toSave);
			return;
		}

		throw new ErrorMethodNotAllowed();
	},

};

export default route;
