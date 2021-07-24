import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { getFeatureList, getPlans } from '@joplin/lib/utils/joplinCloud';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { stripeConfig, updateSubscriptionType } from '../../utils/stripe';
import { bodyFields } from '../../utils/requestUtils';
import { NotificationKey } from '../../models/NotificationModel';
import { AccountType } from '../../models/UserModel';
import { ErrorBadRequest } from '../../utils/errors';
import { createCsrfTag } from '../../utils/csrf';

interface FormFields {
	upgrade_button: string;
}

const router: Router = new Router(RouteType.Web);

function upgradeUrl() {
	return `${config().baseUrl}/upgrade`;
}

router.get('upgrade', async (_path: SubPath, ctx: AppContext) => {
	interface PlanRow {
		basicLabel: string;
		proLabel: string;
	}

	const plans = getPlans(stripeConfig());
	const basicFeatureList = getFeatureList(plans.basic);
	const proFeatureList = getFeatureList(plans.pro);

	const planRows: PlanRow[] = [];

	for (let i = 0; i < basicFeatureList.length; i++) {
		const basic = basicFeatureList[i];
		const pro = proFeatureList[i];

		if (basic.label === pro.label && basic.enabled === pro.enabled) continue;

		planRows.push({
			basicLabel: basic.enabled ? basic.label : '-',
			proLabel: pro.label,
		});
	}

	const view = defaultView('upgrade', 'Upgrade');
	view.content = {
		planRows,
		basicPrice: plans.basic.price,
		proPrice: plans.pro.price,
		postUrl: upgradeUrl(),
		csrfTag: await createCsrfTag(ctx),
	};
	view.cssFiles = ['index/upgrade'];
	return view;
});

router.post('upgrade', async (_path: SubPath, ctx: AppContext) => {
	const fields = await bodyFields<FormFields>(ctx.req);

	const joplin = ctx.joplin;
	const models = joplin.models;

	if (fields.upgrade_button) {
		await updateSubscriptionType(models, joplin.owner.id, AccountType.Pro);
		await models.user().save({ id: joplin.owner.id, account_type: AccountType.Pro });
		await models.notification().add(joplin.owner.id, NotificationKey.UpgradedToPro);
		return redirect(ctx, `${config().baseUrl}/home`);
	}

	throw new ErrorBadRequest('Invalid button');
});

export default router;
