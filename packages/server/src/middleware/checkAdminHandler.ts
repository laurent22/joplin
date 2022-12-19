import { AppContext, KoaNext } from '../utils/types';
import { isAdminRequest } from '../utils/requestUtils';
import { ErrorForbidden } from '../utils/errors';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	if (isAdminRequest(ctx)) {
		if (!ctx.joplin.owner) throw new ErrorForbidden();
		if (!ctx.joplin.owner.is_admin) throw new ErrorForbidden();
	}

	return next();
}
