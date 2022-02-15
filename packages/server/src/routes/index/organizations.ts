import { internalRedirect, redirect, SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { View } from '../../services/MustacheService';
import { _ } from '@joplin/lib/locale';
import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import { createCsrfTag } from '../../utils/csrf';
import { organizationUrl, organizationUsersUrl, organizationUserUrl } from '../../utils/urlUtils';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { Knex } from 'knex';
import { AclAction } from '../../models/BaseModel';
import { yesOrNo } from '../../utils/strings';
import { formatDateTime } from '../../utils/time';
import { organizationUserInvitationStatusToLabel } from '../../services/database/types';
import { validateEmail } from '../../utils/validation';
import { updateOrganizationCapacity } from '../../utils/stripe';
import config from '../../config';

const router = new Router(RouteType.Web);

interface OrganizationFormFields {
	name: string;
	max_users: string;
}

interface OrganizationUserFormFields {
	emails?: string;
	remove_user_button?: string;
	invite_users_button?: string;
	organization_user_id?: string;
}

// This method returns the organisation associated with the logged in user. It
// will throw an error if the user doesn't have one.
const getOrganization = async (path: SubPath, ctx: AppContext) => {
	if (path.id !== 'me') throw new ErrorNotFound();
	const org = ctx.joplin.organization;
	if (!org) throw new ErrorNotFound();
	return org;
};

router.get('organizations/:id', async (path: SubPath, ctx: AppContext) => {
	const org = await getOrganization(path, ctx);

	const fields: OrganizationFormFields = {
		name: org.name,
		max_users: org.max_users.toString(),
	};

	const view: View = {
		...defaultView('organizations/index', _('Organisation')),
		content: {
			fields,
			csrfTag: await createCsrfTag(ctx),
		},
	};

	// view.cssFiles = ['index/changes'];
	return view;
});

router.get('organizations/:id/users', async (path: SubPath, ctx: AppContext, fields: OrganizationUserFormFields = null, error: any = null) => {
	const org = await getOrganization(path, ctx);

	const models = ctx.joplin.models;

	await models.organizationUsers().checkIfAllowed(ctx.joplin.owner, AclAction.List, null, org);

	const pagination = makeTablePagination(ctx.query, 'invitation_email', PaginationOrderDir.ASC);
	const page = await models.organizationUsers().allPaginated(pagination, {
		queryCallback: (query: Knex.QueryBuilder) => {
			void query.where('organization_id', '=', org.id);
			return query;
		},
	});

	const users = await models.user().loadByIds(page.items.map(d => d.user_id), { fields: ['id', 'email'] });

	const table: Table = {
		baseUrl: organizationUrl('me'),
		requestQuery: ctx.query,
		pageCount: page.page_count,
		pagination,
		headers: [
			{
				name: 'select',
				label: '',
				canSort: false,
			},
			{
				name: 'user_id',
				label: _('User'),
			},
			{
				name: 'invitation_email',
				label: _('Invit. email'),
			},
			{
				name: 'invitation_status',
				label: _('Invit. status'),
			},
			{
				name: 'is_admin',
				label: _('Is admin?'),
			},
			{
				name: 'created_time',
				label: _('Added'),
			},
		],
		rows: page.items.map(d => {
			const user = users.find(u => u.id === d.user_id);

			const row: Row = [
				{
					value: `checkbox_${d.id}`,
					checkbox: true,
				},
				{
					value: user?.full_name || user?.email,
					url: organizationUserUrl(d.id),
				},
				{
					value: d.invitation_email,
				},
				{
					value: organizationUserInvitationStatusToLabel(d.invitation_status),
				},
				{
					value: yesOrNo(d.is_admin),
				},
				{
					value: formatDateTime(d.created_time),
				},
			];

			return row;
		}),
	};

	const view: View = {
		...defaultView('organizations/users', _('Organisation users')),
		content: {
			organizationUserTable: makeTableView(table),
			postUrl: organizationUsersUrl('me'),
			updateCapacityUrl: organizationUrl('me'),
			remainingInvitationCount: Math.max(org.max_users - await models.organizations().activeInvitationCount(org.id), 0),
			fields,
			error,
			csrfTag: await createCsrfTag(ctx),
		},
	};

	return view;
});

router.post('organizations/:id/users', async (path: SubPath, ctx: AppContext) => {
	const org = await getOrganization(path, ctx);
	const models = ctx.joplin.models;
	const owner = ctx.joplin.owner;
	const fields = await bodyFields<OrganizationUserFormFields>(ctx.req);

	try {
		if (fields.invite_users_button) {
			const emails = fields.emails.split(',').map(email => email.trim().toLowerCase());
			emails.forEach(email => validateEmail(email));

			for (const email of emails) {
				await models.organizations().inviteUser(org.id, email);
			}
		} else if (fields.remove_user_button) {
			const orgUser = await models.organizationUsers().load(fields.organization_user_id);
			await models.organizationUsers().checkIfAllowed(owner, AclAction.Delete, orgUser, org);
			await models.organizations().removeUser(org.id, orgUser.id);
			await models.notification().addInfo(owner.id, _('User was successfully removed from the organisation'));
		} else {
			throw new ErrorBadRequest('No action provided');
		}

		return redirect(ctx, organizationUsersUrl('me'));
	} catch (error) {
		return internalRedirect(path, ctx, router, 'organizations/:id/users', fields, error);
	}
});

router.post('organizations/:id', async (path: SubPath, ctx: AppContext) => {
	const org = await getOrganization(path, ctx);

	const models = ctx.joplin.models;

	const fields = await bodyFields<OrganizationFormFields>(ctx.req);
	const maxUsers = Number(fields.max_users);

	if (config().isJoplinCloud) {
		if (org.max_users !== maxUsers) {
			await updateOrganizationCapacity(models, org.id, maxUsers);
		}
	}

	await models.organizations().save({
		id: org.id,
		name: fields.name,
		max_users: maxUsers,
	});

	return redirect(ctx, organizationUrl('me'));
});

export default router;
