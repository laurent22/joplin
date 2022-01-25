import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { _ } from '@joplin/lib/locale';
import { ErrorNotFound } from '../../utils/errors';
import { AclAction } from '../../models/BaseModel';
import { createCsrfTag } from '../../utils/csrf';
import { organizationUsersUrl } from '../../utils/urlUtils';

const router = new Router(RouteType.Web);

const getOrgUser = async (path: SubPath, ctx: AppContext) => {
	const orgUser = await ctx.joplin.models.organizationUsers().load(path.id);
	if (!orgUser) throw new ErrorNotFound();

	await ctx.joplin.models.organizationUsers().checkIfAllowed(ctx.joplin.owner, AclAction.Read, orgUser);

	return orgUser;
};

router.get('organization_users/:id', async (path: SubPath, ctx: AppContext) => {
	const models = ctx.joplin.models;

	const orgUser = await getOrgUser(path, ctx);
	const user = await models.user().load(orgUser.user_id);

	// TODO: move organizationUsersUrl to organization_users

	const view: View = {
		...defaultView('organizations/user', _('Organisation user')),
		content: {
			csrfTag: await createCsrfTag(ctx),
			user,
			orgUser,
			postUrl: organizationUsersUrl('me'),
		},
	};

	return view;
});

export default router;
