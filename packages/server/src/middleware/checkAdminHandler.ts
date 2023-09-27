import { AppContext, KoaNext } from '../utils/types';
import { isAdminRequest } from '../utils/requestUtils';
import { ErrorForbidden } from '../utils/errors';
import config from '../config';
import webLogout from '../utils/webLogout';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	const owner = ctx.joplin.owner;

	if (isAdminRequest(ctx)) {
		if (!config().IS_ADMIN_INSTANCE) throw new ErrorForbidden();
		if (!owner || !owner.is_admin) throw new ErrorForbidden();
	}

	// This can happen if an instance is switched from admin to non-admin. In
	// that case, the user is still logged in as an admin, but on a non-admin
	// instance so we log him out.
	if (owner && owner.is_admin && !config().IS_ADMIN_INSTANCE) {
		await webLogout(ctx);
		throw new ErrorForbidden();
	}

	return next();
}
