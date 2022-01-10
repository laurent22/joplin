import defaultView from '../../../utils/defaultView';
import Router from '../../../utils/Router';
import { redirect, SubPath } from '../../../utils/routeUtils';
import { AppContext, HttpMethod, RouteType } from '../../../utils/types';
import { _ } from '@joplin/lib/locale';
import { View } from '../../../services/MustacheService';
import { createCsrfTag } from '../../../utils/csrf';
import { adminOrganizationUrl } from '../../../utils/urlUtils';
import { bodyFields } from '../../../utils/requestUtils';
import { Organization } from '../../../services/database/types';
import { ErrorBadRequest } from '../../../utils/errors';
import { AccountType } from '../../../models/UserModel';

interface FormFields {
	id: string;
	name: string;
	owner_email: string;
	is_new: string;
}

const router: Router = new Router(RouteType.Web);

router.get('admin/organizations', async (_path: SubPath, _ctx: AppContext) => {
	const view = defaultView('admin/organizations', _('Organizations'));
	return view;
});

router.post('admin/organizations/:id', async (path: SubPath, ctx: AppContext) => {
	const models = ctx.joplin.models;

	const fields = await bodyFields<FormFields>(ctx.req);
	const isNew = path.id === 'new';

	try {
		const orgOwner = await models.user().loadByEmail(fields.owner_email);
		if (!orgOwner) throw new ErrorBadRequest(_('No such user: %s', fields.owner_email));
		if (orgOwner.account_type !== AccountType.Pro) throw new Error('Owner must be a Pro account');

		const org: Organization = {
			name: fields.name,
			owner_id: orgOwner.id,
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
	const isNew = path.id === 'new';

	const view: View = {
		...defaultView('admin/organization', _('Organization')),
		content: {
			error,
			fields,
			csrfTag: await createCsrfTag(ctx),
			organization: fields,
			buttonTitle: isNew ? _('Create organization') : _('Update organization'),
			postUrl: adminOrganizationUrl(path.id),
			s: {
				ownerEmailMustExist: _('Owner must exist in the system'),
			},
		},
	};

	return view;
});

export default router;
