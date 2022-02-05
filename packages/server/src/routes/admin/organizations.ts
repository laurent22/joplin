import defaultView from '../../utils/defaultView';
import Router from '../../utils/Router';
import { redirect, SubPath } from '../../utils/routeUtils';
import { AppContext, HttpMethod, RouteType } from '../../utils/types';
import { _ } from '@joplin/lib/locale';
import { View } from '../../services/MustacheService';
import { createCsrfTag } from '../../utils/csrf';
import { adminOrganizationsUrl, adminOrganizationUrl, adminUserUrl } from '../../utils/urlUtils';
import { bodyFields } from '../../utils/requestUtils';
import { Organization } from '../../services/database/types';
import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { makeTablePagination, makeTableView, Row, Table } from '../../utils/views/table';
import { PaginationOrderDir } from '../../models/utils/pagination';
import { formatDateTime } from '../../utils/time';
import { organizationDefaultValues } from '../../services/database/defaultValues';

interface FormFields {
	id: string;
	name: string;
	owner_email: string;
	is_new: string;
	max_users: string;
}

const defaultFields: FormFields = {
	id: '',
	name: '',
	owner_email: '',
	is_new: '0',
	max_users: organizationDefaultValues().max_users.toString(),
};

const router: Router = new Router(RouteType.Web);

router.get('admin/organizations', async (_path: SubPath, ctx: AppContext) => {
	const pagination = makeTablePagination(ctx.query, 'name', PaginationOrderDir.ASC);
	const page = await ctx.joplin.models.organizations().allPaginated(pagination);
	const owners = await ctx.joplin.models.user().loadByIds(page.items.map(d => d.owner_id), { fields: ['id', 'email'] });

	const table: Table = {
		baseUrl: adminOrganizationsUrl(),
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
				name: 'name',
				label: _('Name'),
				stretch: true,
			},
			{
				name: 'owner_id',
				label: _('Owner'),
			},
			{
				name: 'max_users',
				label: _('Users'),
			},
			{
				name: 'created_time',
				label: _('Created'),
			},
		],
		rows: page.items.map(d => {
			const row: Row = [
				{
					value: `checkbox_${d.id}`,
					checkbox: true,
				},
				{
					value: d.name,
					url: adminOrganizationUrl(d.id),
				},
				{
					value: owners.find(o => o.id === d.owner_id)?.email,
					url: adminUserUrl(d.owner_id),
				},
				{
					value: d.max_users.toString(),
				},
				{
					value: formatDateTime(d.created_time),
				},
			];

			return row;
		}),
	};

	const view = defaultView('admin/organizations', _('Organizations'));
	view.content = {
		organizationTable: makeTableView(table),
		postUrl: adminOrganizationsUrl(),
		csrfTag: await createCsrfTag(ctx),
	};
	// view.cssFiles = ['admin/organizations'];

	return view;
});

router.post('admin/organizations/:id', async (path: SubPath, ctx: AppContext) => {
	const models = ctx.joplin.models;

	const fields = await bodyFields<FormFields>(ctx.req);
	const isNew = path.id === 'new';

	try {
		const orgOwner = await models.user().loadByEmail(fields.owner_email);
		if (!orgOwner) throw new ErrorBadRequest(_('No such user: %s', fields.owner_email));

		const org: Organization = {
			name: fields.name,
			owner_id: orgOwner.id,
			max_users: Number(fields.max_users),
		};

		if (!isNew) {
			org.id = fields.id;
		}

		const savedOrg = await models.organizations().save(org);

		await models.notification().addInfo(ctx.joplin.owner.id, isNew ? _('The new organisation has been created.') : _('The organisation has been saved.'));

		return redirect(ctx, adminOrganizationUrl(savedOrg.id));
	} catch (error) {
		const endPoint = router.findEndPoint(HttpMethod.GET, 'admin/organizations/:id');
		return endPoint.handler(path, ctx, fields, error);
	}
});

router.get('admin/organizations/:id', async (path: SubPath, ctx: AppContext, fields: FormFields = null, error: any = null) => {
	const models = ctx.joplin.models;
	const isNew = path.id === 'new';

	if (!fields && !isNew) {
		const org = await models.organizations().load(path.id);
		if (!org) throw new ErrorNotFound();

		const orgOwner = await models.user().load(org.owner_id);

		if (!orgOwner) await models.notification().addError(ctx.joplin.owner.id, `Cannot find organisation owner: ${orgOwner.id}`);

		fields = {
			...defaultFields,
			id: org.id,
			name: org.name,
			owner_email: orgOwner ? orgOwner.email : '',
			max_users: org.max_users.toString(),
		};
	}

	if (!fields && isNew) {
		fields = {
			...defaultFields,
		};
	}

	const view: View = {
		...defaultView('admin/organization', _('Organisation')),
		content: {
			error,
			fields,
			csrfTag: await createCsrfTag(ctx),
			organization: fields,
			buttonTitle: isNew ? _('Create organisation') : _('Update organisation'),
			postUrl: adminOrganizationUrl(path.id),
			s: {
				ownerEmailMustExist: _('Owner must exist in the system and must be a Pro account'),
			},
		},
	};

	return view;
});

export default router;
