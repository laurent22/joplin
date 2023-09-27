import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { AccountType, accountTypeToString } from '../../models/UserModel';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanReceiveFolder, getCanShareFolder, totalSizeClass } from '../../models/utils/user';
import config from '../../config';
import { escapeHtml } from '../../utils/htmlUtils';
import { betaStartSubUrl, betaUserTrialPeriodDays, isBetaUser } from '../../utils/stripe';

const router: Router = new Router(RouteType.Web);

function setupMessageHtml() {
	if (config().isJoplinCloud) {
		return `In this screen, select "<strong>${escapeHtml(config().appName)}</strong>" as a synchronisation target and enter your username and password`;
	} else {
		return `In this screen, select "<strong>Joplin Server</strong>" as a synchronisation target, then enter the URL <strong>${config().apiBaseUrl}</strong> and your username and password`;
	}
}

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		const user = ctx.joplin.owner;
		const subscription = await ctx.joplin.models.subscription().byUserId(user.id);

		const view = defaultView('home', 'Home');
		view.content = {
			userProps: [
				{
					label: 'Account type',
					value: accountTypeToString(user.account_type),
					show: true,
				},
				{
					label: 'Is admin',
					value: yesOrNo(user.is_admin),
					show: !!user.is_admin,
				},
				{
					label: 'Max item size',
					value: formatMaxItemSize(user),
					show: true,
				},
				{
					label: 'Total size',
					classes: [totalSizeClass(user)],
					value: `${formatTotalSize(user)} (${formatTotalSizePercent(user)})`,
					show: true,
				},
				{
					label: 'Max total size',
					value: formatMaxTotalSize(user),
					show: true,
				},
				{
					label: 'Can publish notes',
					value: yesOrNo(true),
					show: true,
				},
				{
					label: 'Can share notebooks',
					value: yesOrNo(getCanShareFolder(user)),
					show: true,
				},
				{
					label: 'Can receive notebooks',
					value: yesOrNo(getCanReceiveFolder(user)),
					show: true,
				},
			],
			showUpgradeProButton: subscription && user.account_type === AccountType.Basic,
			showBetaMessage: await isBetaUser(ctx.joplin.models, user.id),
			betaExpiredDays: betaUserTrialPeriodDays(user.created_time, 0, 0),
			betaStartSubUrl: betaStartSubUrl(user.email, user.account_type),
			setupMessageHtml: setupMessageHtml(),
		};

		view.cssFiles = ['index/home'];

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

export default router;
