
import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import defaultView from '../../utils/defaultView';
import { formParse, userIp } from '../../utils/requestUtils';
import { applicationDeleteUrl, applicationsConfirmUrl, applicationsUrl, homeUrl, loginUrl } from '../../utils/urlUtils';
import { createCsrfTag } from '../../utils/csrf';
import { _ } from '@joplin/lib/locale';
import config from '../../config';
import { formatDate } from '../../utils/time';
import ApplicationModel, { ActiveApplication } from '../../models/ApplicationModel';
import { AclAction } from '../../models/BaseModel';
import { ErrorForbidden } from '../../utils/errors';

const router: Router = new Router(RouteType.Web);

router.publicSchemas.push('applications/:id/confirm');

function makeView(error: Error = null, applicationAuthId: string, csrfTag: string) {
	const view = defaultView('applications/confirm', 'Confirm application authorisation');
	view.content = {
		error,
		applicationAuthId,
		csrfTag,
		postUrl: applicationsConfirmUrl(applicationAuthId),
		cancelRedirect: homeUrl(),
		title: _('Authorisation required'),
		description: _('Joplin needs your permission to access your %s account and to synchronise data with it.', config().appName),
		cancel: _('Cancel'),
		authorise: _('Authorise'),
	};
	return view;
}

type TableColumn = {
	key: 'platform' | 'version' | 'ip' | 'created_time' | 'last_access_time';
	label: string;
};

const buildApplicationTable = (activeApplications: ActiveApplication[], applicationModel: ApplicationModel) => {
	const tableColumns: TableColumn[] = [
		{ key: 'platform', label: 'Platform' },
		{ key: 'version', label: 'Application' },
		{ key: 'ip', label: 'IP' },
		{ key: 'created_time', label: 'Connected' },
		{ key: 'last_access_time', label: 'Last active' },
	];

	const formattedData = activeApplications.map(row => {
		return {
			id: row.id,
			ip: row.ip,
			platform: applicationModel.getPlatformName(row.platform),
			version: row.version ? `v${row.version}` : 'Unknown',
			last_access_time: formatDate(parseInt(row.last_access_time, 10)),
			created_time: formatDate(parseInt(row.created_time, 10)),
			postUrl: applicationDeleteUrl(row.id),
		};
	});

	const table = formattedData.map(formattedDataRow => {
		return {
			deleteUrl: applicationDeleteUrl(formattedDataRow.id),
			columns: tableColumns.map(tableColumn => {
				return {
					...tableColumn,
					value: formattedDataRow[tableColumn.key],
				};
			}),

		};
	});

	return table;
};

router.get('applications', async (_path: SubPath, ctx: AppContext) => {
	const activeApplications = await ctx.joplin.models.application().activeApplications(ctx.joplin.owner.id);
	const view = defaultView('applications/applications', 'Applications');
	view.content = {
		csrfTag: await createCsrfTag(ctx),
		applications: buildApplicationTable(activeApplications, ctx.joplin.models.application()),
	};

	return view;
});

router.post('applications/:id/delete', async (path: SubPath, ctx: AppContext) => {
	const application = await ctx.joplin.models.application().load(path.id, { fields: ['user_id'] });
	await ctx.joplin.models.application().checkIfAllowed(ctx.joplin.owner, AclAction.Delete, application);
	await ctx.joplin.models.application().delete(path.id);

	return redirect(ctx, applicationsUrl());
});

router.get('applications/:id/confirm', async (path: SubPath, ctx: AppContext) => {
	if (!ctx.joplin.owner) {
		return redirect(ctx, loginUrl(path.id));
	}

	await ctx.joplin.models.application().createPreLoginRecord(
		path.id,
		userIp(ctx),
		ctx.query.version as string,
		ctx.query.platform as string,
		ctx.query.type as string,
	);

	return makeView(null, path.id, await createCsrfTag(ctx));
});

router.post('applications/:id/confirm', async (_path: SubPath, ctx: AppContext) => {
	if (!ctx.joplin.owner) {
		throw new ErrorForbidden('Your sessions must have expired. Please login again.');
	}

	const body = await formParse(ctx.req);

	await ctx.joplin.models.application().onAuthorizeUse(body.fields.applicationAuthId, ctx.joplin.owner.id);

	return redirect(ctx, homeUrl());
});

export default router;
