import { AppContext, KoaNext, NotificationView } from '../utils/types';
import { isApiRequest } from '../utils/requestUtils';
import { NotificationLevel } from '../services/database/types';
import { defaultAdminEmail } from '../db';
import { _, _n } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import { NotificationKey } from '../models/NotificationModel';
import { adminUsersUrl, helpUrl, profileUrl } from '../utils/urlUtils';
import { userFlagToString } from '../models/UserFlagModel';
import renderMarkdown from '../utils/renderMarkdown';
import config from '../config';
import { unique } from '../utils/array';
import { formatDurationToDays } from '../utils/time';

const logger = Logger.create('notificationHandler');

async function handleChangeAdminPasswordNotification(ctx: AppContext) {
	if (!ctx.joplin.owner.is_admin) return;

	const findInsecureAdminPassword = async () => {
		// Check both the user-set default admin password and 'admin' -- the config's defaultAdminPassword
		// is only applied on first startup:
		const dangerousPasswords = unique([config().defaultAdminPassword, 'admin']);
		for (const password of dangerousPasswords) {
			const admin = await ctx.joplin.models.user().login(defaultAdminEmail, password, ctx.joplin.services);
			if (admin) {
				return password;
			}
		}

		return null;
	};

	const notificationModel = ctx.joplin.models.notification();

	const foundAdminPassword = await findInsecureAdminPassword();
	if (foundAdminPassword) {
		const knownInsecurePassword = foundAdminPassword === 'admin';
		let message;
		if (knownInsecurePassword) {
			message = _('The default admin password is insecure and has not been changed! [Change it now](%s)', profileUrl());
		} else {
			message = _('The default admin password has not been changed! [Change it now](%s)', profileUrl());
		}

		await notificationModel.add(
			ctx.joplin.owner.id,
			NotificationKey.ChangeAdminPassword,
			NotificationLevel.Important,
			message,
		);
	} else {
		await notificationModel.setRead(ctx.joplin.owner.id, NotificationKey.ChangeAdminPassword);
	}
}

const handleLicenseStatusNotification = async (ctx: AppContext): Promise<NotificationView|null> => {
	const licenseStatus = { gracePeriod: false, expired: false, maximumUserCount: -1, licenceRemainingTime: -1 };
	const isOverUserCapacity = () => Promise.resolve(false);

	const licenseDashboardUrl = () => '';
	const getUpdateLicenseKeyCallToAction = () => _('Please update the license key from the [admin dashboard](%s).', licenseDashboardUrl());

	if (licenseStatus.gracePeriod && ctx.joplin.owner?.is_admin) {
		return {
			id: 'licenseExpiring',
			messageHtml: renderMarkdown([
				_('The license key for this Joplin Server Business instance has expired and needs to be renewed.'),
				_('Item upload will be disabled in %s.', formatDurationToDays(licenseStatus.licenceRemainingTime)),
				'',
				getUpdateLicenseKeyCallToAction(),
			].join('\n')),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	} else if (licenseStatus.expired) {
		return {
			id: 'licenseExpiring',
			messageHtml: renderMarkdown([
				_('The license key for this Joplin Server Business instance has expired or is invalid. Uploading items has been disabled until the license is renewed.'),
				'',
				getUpdateLicenseKeyCallToAction(),
			].join('\n')),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	} else if (await isOverUserCapacity() && ctx.joplin.owner?.is_admin) {
		return {
			id: 'licenseCapacityExceeded',
			messageHtml: renderMarkdown([
				_('Item upload has been disabled.'),
				_n(
					'This Joplin Server Business instance is only licensed for %d user.',
					'This Joplin Server Business instance is only licensed for %d users.',
					licenseStatus.maximumUserCount,
					licenseStatus.maximumUserCount,
				),
				'\n\n',
				_('Please disable users from the [admin dashboard](%s) to bring this server under the limit.', adminUsersUrl()),
			].join(' ')),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	}

	if (ctx.joplin.owner?.is_admin) {
		const licenseRefreshError = '';

		if (licenseRefreshError) {
			return {
				id: 'licenseRefreshError',
				messageHtml: renderMarkdown([
					_('The license for this server failed to refresh.'),
					_('Error: %s', licenseRefreshError),
					'\n\n',
					_('Manage this server\'s license from the [admin dashboard](%s).', licenseDashboardUrl()),
				].join(' ')),
				levelClassName: levelClassName(NotificationLevel.Important),
				closeUrl: '',
			};
		}
	}

	return null;
};

// Special notification that cannot be dismissed.
async function handleUserFlags(ctx: AppContext): Promise<NotificationView> {
	const user = ctx.joplin.owner;

	const flags = await ctx.joplin.models.userFlag().allByUserId(ctx.joplin.owner.id);
	const flagStrings = flags.map(f => `- ${userFlagToString(f)}`).join('\n');

	if (!user.enabled || !user.can_upload) {
		return {
			id: 'accountDisabled',
			messageHtml: renderMarkdown(`Your account is disabled for the following reason(s):\n\n${flagStrings}\n\nPlease check the [help section](${helpUrl()}) for further information or contact support.`),
			levelClassName: levelClassName(NotificationLevel.Error),
			closeUrl: '',
		};
	} else if (flags.length) {
		// Actually currently all flags result in either disabled upload or
		// disabled account, but keeping that here anyway just in case.
		return {
			id: 'accountFlags',
			messageHtml: renderMarkdown(`The following issues have been detected on your account:\n\n${flagStrings}\n\nPlease check the [help section](${helpUrl()}) for further information or contact support.`),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	}

	return null;
}

async function handleConfirmEmailNotification(ctx: AppContext): Promise<NotificationView> {
	if (!ctx.joplin.owner) return null;

	if (!ctx.joplin.owner.email_confirmed) {
		return {
			id: 'confirmEmail',
			messageHtml: renderMarkdown(`An email has been sent to you containing an activation link to complete your registration. If you did not receive it, you may send it again from [your profile page](${profileUrl()}).\n\nMake sure you click it to secure your account and keep access to it.`),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	}

	return null;
}


// async function handleSqliteInProdNotification(ctx: AppContext) {
// 	if (!ctx.joplin.owner.is_admin) return;

// 	const notificationModel = ctx.joplin.models.notification();

// 	if (config().database.client === 'sqlite3' && ctx.joplin.env === 'prod') {
// 		await notificationModel.add(
// 			ctx.joplin.owner.id,
// 			NotificationKey.UsingSqliteInProd
// 		);
// 	}
// }

function levelClassName(level: NotificationLevel): string {
	if (level === NotificationLevel.Important) return 'is-warning';
	if (level === NotificationLevel.Normal) return 'is-info';
	if (level === NotificationLevel.Error) return 'is-danger';
	throw new Error(`Unknown level: ${level}`);
}

async function makeNotificationViews(ctx: AppContext): Promise<NotificationView[]> {
	const notificationModel = ctx.joplin.models.notification();
	const notifications = await notificationModel.allUnreadByUserId(ctx.joplin.owner.id);
	const views: NotificationView[] = [];
	for (const n of notifications) {
		views.push({
			id: n.id,
			messageHtml: renderMarkdown(n.message),
			levelClassName: levelClassName(n.level),
			closeUrl: notificationModel.closeUrl(n.id),
		});
	}

	return views;
}

// The role of this middleware is to inspect the system and to generate
// notifications for any issue it finds. It is only active for logged in users
// on the website. It is inactive for API calls.
export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	ctx.joplin.notifications = [];

	try {
		if (isApiRequest(ctx)) return next();
		if (!ctx.joplin.owner) return next();

		await handleChangeAdminPasswordNotification(ctx);
		await handleConfirmEmailNotification(ctx);
		// await handleSqliteInProdNotification(ctx);
		const notificationViews = await makeNotificationViews(ctx);

		const nonDismisableViews = [
			await handleUserFlags(ctx),
			await handleLicenseStatusNotification(ctx),
			await handleConfirmEmailNotification(ctx),
		];

		for (const nonDismisableView of nonDismisableViews) {
			if (nonDismisableView) notificationViews.push(nonDismisableView);
		}

		ctx.joplin.notifications = notificationViews;
	} catch (error) {
		logger.error(error);
	}

	return next();
}
