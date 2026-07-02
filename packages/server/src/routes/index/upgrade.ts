import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { findPrice, PricePeriod, getFeatureLabel, getFeatureEnabled, getAllFeatureIds } from '@joplin/lib/utils/joplinCloud';
import config from '../../config';
import defaultView from '../../utils/defaultView';
import { initStripe, stripeConfig, stripePriceIdByUserId, updateSubscriptionType } from '../../utils/stripe';
import { bodyFields } from '../../utils/requestUtils';
import { NotificationKey } from '../../models/NotificationModel';
import { AccountType, accountTypeToPlan, accountTypeToString, getNextSubscriptionPlan } from '../../models/UserModel';
import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { createCsrfTag } from '../../utils/csrf';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('index/upgrade');

interface FormFields {
	upgrade_button: string;
	to_plan: string;
}

const router: Router = new Router(RouteType.Web);

function upgradeUrl() {
	return `${config().baseUrl}/upgrade`;
}

const getUpgradeToAccountType = (ctx: AppContext) => {
	const { upgradeTo } = getNextSubscriptionPlan(ctx.joplin.owner.account_type);
	if (!upgradeTo) {
		throw new ErrorNotFound(`There are no upgrade options available for this account type (${accountTypeToString(ctx.joplin.owner.account_type)}).`);
	}
	return upgradeTo;
};

router.get('upgrade', async (_path: SubPath, ctx: AppContext) => {
	const upgradeFrom = ctx.joplin.owner.account_type;
	const upgradeTo = getUpgradeToAccountType(ctx);

	interface PlanRow {
		currentLabel: string;
		upgradeLabel: string;
	}

	const featureIds = getAllFeatureIds();

	const planRows: PlanRow[] = [];

	const fromPlanName = accountTypeToPlan(upgradeFrom);
	const toPlanName = accountTypeToPlan(upgradeTo);
	for (let i = 0; i < featureIds.length; i++) {
		const featureId = featureIds[i];

		const fromLabel = getFeatureLabel(fromPlanName, featureId);
		const toLabel = getFeatureLabel(toPlanName, featureId);
		const fromEnabled = getFeatureEnabled(fromPlanName, featureId);
		const toEnabled = getFeatureEnabled(toPlanName, featureId);

		if (fromLabel === toLabel && fromEnabled === toEnabled) continue;

		planRows.push({
			currentLabel: fromEnabled ? fromLabel : '-',
			upgradeLabel: toLabel,
		});
	}

	const stripe = initStripe();
	const priceId = await stripePriceIdByUserId(stripe, ctx.joplin.models, ctx.joplin.owner.id);

	const currentPrice = findPrice(stripeConfig(), { priceId });
	const upgradePrice = findPrice(stripeConfig(), {
		accountType: upgradeTo,
		period: currentPrice.period,
	});

	const view = defaultView('upgrade', 'Upgrade');
	view.content = {
		planRows,
		currentPriceName: accountTypeToString(upgradeFrom),
		upgradePriceName: accountTypeToString(upgradeTo),
		currentPrice,
		upgradePrice,
		postUrl: upgradeUrl(),
		csrfTag: await createCsrfTag(ctx),
		showYearlyPrices: currentPrice.period === PricePeriod.Yearly,
	};
	view.cssFiles = ['index/upgrade'];
	return view;
});

router.post('upgrade', async (_path: SubPath, ctx: AppContext) => {
	const upgradeTo = getUpgradeToAccountType(ctx);

	const fields = await bodyFields<FormFields>(ctx.req);
	if (Number(fields.to_plan) !== upgradeTo) {
		throw new ErrorBadRequest(`Unexpected next plan type: ${fields.to_plan}. Expected ${upgradeTo}. (Has the account already been upgraded?)`);
	}

	const joplin = ctx.joplin;
	const models = joplin.models;

	if (fields.upgrade_button) {
		const stripe = initStripe();
		await updateSubscriptionType(stripe, models, joplin.owner.id, upgradeTo);
		await models.user().save({ id: joplin.owner.id, account_type: upgradeTo });
		const notificationKey = (() => {
			if (upgradeTo === AccountType.Pro) return NotificationKey.UpgradedToPro;
			if (upgradeTo === AccountType.Pro100Gb) return NotificationKey.UpgradedToPro100Gb;
			logger.warn('No notification key for upgrade type', upgradeTo);
			return NotificationKey.Any;
		})();
		await models.notification().add(joplin.owner.id, notificationKey);
		return redirect(ctx, `${config().baseUrl}/home`);
	}

	throw new ErrorBadRequest('Invalid button');
});

export default router;
