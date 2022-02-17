import { internalRedirect, redirect, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { _ } from '@joplin/lib/locale';
import { ErrorNotFound } from '../../utils/errors';
import { AclAction } from '../../models/BaseModel';
import { createCsrfTag } from '../../utils/csrf';
import { homeUrl, organizationInvitationConfirmUrl, organizationUsersUrl } from '../../utils/urlUtils';
import { bodyFields } from '../../utils/requestUtils';
import { checkRepeatPassword } from './users';
import { cookieSet } from '../../utils/cookies';
import { NotificationKey } from '../../models/NotificationModel';
import { OrganizationUserInvitationStatus } from '../../services/database/types';

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

router.publicSchemas.push('organization_users/:id/confirm');

interface SetPasswordFormData {
	token: string;
	password: string;
	password2: string;
}

router.get('organization_users/:id/confirm', async (path: SubPath, ctx: AppContext, _fields: SetPasswordFormData = null, error: any = null) => {
	const models = ctx.joplin.models;
	const orgUser = await models.organizationUsers().load(path.id);
	const { token } = ctx.query;

	const view: View = {
		...defaultView('users/confirm', _('Organisation user')),
		content: {
			user: {
				email: orgUser.invitation_email,
			},
			token,
			error,
			postUrl: organizationInvitationConfirmUrl(orgUser.id, token),
		},
	};

	return view;
});

router.post('organization_users/:id/confirm', async (path: SubPath, ctx: AppContext) => {
	const orgUserId = path.id;
	const models = ctx.joplin.models;
	let fields: SetPasswordFormData = null;

	try {
		fields = await bodyFields<SetPasswordFormData>(ctx.req);
		await models.token().checkToken('', fields.token);

		const password = checkRepeatPassword(fields, true);

		await models.token().deleteByValue('', fields.token);

		const user = await models.organizations().respondInvitation(orgUserId, OrganizationUserInvitationStatus.Accepted, password);

		const session = await models.session().createUserSession(user.id);
		cookieSet(ctx, 'sessionId', session.id);

		await models.notification().add(user.id, NotificationKey.PasswordSet);

		return redirect(ctx, homeUrl());
	} catch (error) {
		return internalRedirect(path, ctx, router, 'organization_users/:id/confirm', fields, error);
	}
});

export default router;
