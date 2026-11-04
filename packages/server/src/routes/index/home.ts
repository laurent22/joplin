import { SubPath, redirect } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { contextSessionId } from '../../utils/requestUtils';
import { ErrorMethodNotAllowed } from '../../utils/errors';
import defaultView from '../../utils/defaultView';
import { AccountType, accountTypeToString } from '../../models/UserModel';
import { formatMaxItemSize, formatMaxTotalSize, formatTotalSize, formatTotalSizePercent, yesOrNo } from '../../utils/strings';
import { getCanReceiveFolder, getCanShareFolder, getIsMFAEnabled, totalSizeClass } from '../../models/utils/user';
import config from '../../config';
import { escapeHtml } from '../../utils/htmlUtils';
import { betaStartSubUrl, betaUserTrialPeriodDays, isBetaUser } from '../../utils/stripe';
import showJoplinServerBusinessPromo from '../../utils/showJoplinServerBusinessPromo';
import { Day } from '../../utils/time';
import { homeUrl } from '../../utils/urlUtils';
import { createCsrfTag } from '../../utils/csrf';

const router: Router = new Router(RouteType.Web);

export const mfaPromptDismissedKey = (userId: string) => `mfaPromptDismissedTime::${userId}`;

const shouldShowMfaPrompt = async (ctx: AppContext) => {
	const user = ctx.joplin.owner;
	if (!config().MFA_ENABLED || getIsMFAEnabled(user)) return false;

	const key = mfaPromptDismissedKey(user.id);
	const dismissedTime = await ctx.joplin.models.keyValue().value<number>(key);
	const isDismissalExpired = Date.now() - dismissedTime >= 30 * Day;
	return !dismissedTime || isDismissalExpired;
};

function setupMessageHtml() {
	if (config().isJoplinCloud) {
		return `In this screen, select "<strong>${escapeHtml(config().appName)}</strong>" as a synchronisation target and enter your username and password`;
	} else {
		return `In this screen, select "<strong>Joplin Server</strong>" as a synchronisation target, then enter the URL <strong>${config().apiBaseUrl}</strong> and your username and password`;
	}
}

// Note: Take the list from `packages/doc-builder/docusaurus.config.js`
const socialFeeds = () => {
	return [
		{
			label: 'Bluesky',
			href: 'https://bsky.app/profile/joplinapp.bsky.social',
		},
		{
			label: 'Patreon',
			href: 'https://www.patreon.com/joplin',
		},
		{
			label: 'YouTube',
			href: 'https://www.youtube.com/@joplinapp',
		},
		{
			label: 'LinkedIn',
			href: 'https://www.linkedin.com/company/joplin',
		},
		{
			label: 'Discord',
			href: 'https://discord.gg/VSj7AFHvpq',
		},
		{
			label: 'Mastodon',
			href: 'https://mastodon.social/@joplinapp',
		},
		{
			label: 'Lemmy',
			href: 'https://sopuli.xyz/c/joplinapp',
		},
		{
			label: 'GitHub',
			href: 'https://github.com/laurent22/joplin/',
		},
	];
};

router.get('home', async (_path: SubPath, ctx: AppContext) => {
	contextSessionId(ctx);

	if (ctx.method === 'GET') {
		const user = ctx.joplin.owner;
		const subscription = await ctx.joplin.models.subscription().byUserId(user.id);
		const isExternal = false;
		const showMfaPrompt = await shouldShowMfaPrompt(ctx);

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
					show: !isExternal,
				},
				{
					label: 'Total size',
					classes: [totalSizeClass(user)],
					value: `${formatTotalSize(user)} (${formatTotalSizePercent(user)})`,
					show: !isExternal,
				},
				{
					label: 'Max total size',
					value: formatMaxTotalSize(user),
					show: !isExternal,
				},
				{
					label: 'Can publish notes',
					value: yesOrNo(true),
					show: !isExternal,
				},
				{
					label: 'Can share notebooks',
					value: yesOrNo(getCanShareFolder(user)),
					show: !isExternal,
				},
				{
					label: 'Can receive notebooks',
					value: !!yesOrNo(getCanReceiveFolder(user)),
					show: !isExternal,
				},
			],
			showUpgradeProButton: subscription && user.account_type === AccountType.Basic,
			showBetaMessage: await isBetaUser(ctx.joplin.models, user.id),
			betaExpiredDays: betaUserTrialPeriodDays(user.created_time, 0, 0),
			betaStartSubUrl: betaStartSubUrl(user.email, user.account_type),
			setupMessageHtml: setupMessageHtml(),
			syncTargetName: isExternal ? 'Joplin Server Business' : config().appName,
			isExternal,
			isJoplinCloud: config().isJoplinCloud,
			showJoplinServerBusinessPromo: await showJoplinServerBusinessPromo(ctx.joplin.models),
			socialFeeds: socialFeeds(),
			showMfaPrompt,
			csrfTag: showMfaPrompt ? await createCsrfTag(ctx) : '',
		};

		view.cssFiles = ['index/home'];

		return view;
	}

	throw new ErrorMethodNotAllowed();
});

router.post('home', async (_path: SubPath, ctx: AppContext) => {
	const key = mfaPromptDismissedKey(ctx.joplin.owner.id);
	await ctx.joplin.models.keyValue().setValue(key, Date.now());
	return redirect(ctx, homeUrl());
});

export default router;
