import { AppContext, KoaNext, NotificationView } from '../utils/types';
import { isApiRequest } from '../utils/requestUtils';
import { defaultAdminEmail, defaultAdminPassword, NotificationLevel } from '../db';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import * as MarkdownIt from 'markdown-it';
import config from '../config';

const logger = Logger.create('notificationHandler');

async function handleChangeAdminPasswordNotification(ctx: AppContext) {
	if (!ctx.owner.is_admin) return;

	const defaultAdmin = await ctx.models.user().login(defaultAdminEmail, defaultAdminPassword);
	const notificationModel = ctx.models.notification({ userId: ctx.owner.id });

	if (defaultAdmin) {
		await notificationModel.add(
			'change_admin_password',
			NotificationLevel.Important,
			_('The default admin password is insecure and has not been changed! [Change it now](%s)', await ctx.models.user().profileUrl())
		);
	} else {
		await notificationModel.markAsRead('change_admin_password');
	}

	if (config().database.client === 'sqlite3' && ctx.env === 'prod') {
		await notificationModel.add(
			'using_sqlite_in_prod',
			NotificationLevel.Important,
			'The server is currently using SQLite3 as a database. It is not recommended in production as it is slow and can cause locking issues. Please see the README for information on how to change it.'
		);
	}
}

async function handleSqliteInProdNotification(ctx: AppContext) {
	if (!ctx.owner.is_admin) return;

	const notificationModel = ctx.models.notification({ userId: ctx.owner.id });

	if (config().database.client === 'sqlite3' && ctx.env === 'prod') {
		await notificationModel.add(
			'using_sqlite_in_prod',
			NotificationLevel.Important,
			'The server is currently using SQLite3 as a database. It is not recommended in production as it is slow and can cause locking issues. Please see the README for information on how to change it.'
		);
	}
}

async function makeNotificationViews(ctx: AppContext): Promise<NotificationView[]> {
	const markdownIt = new MarkdownIt();

	const notificationModel = ctx.models.notification({ userId: ctx.owner.id });
	const notifications = await notificationModel.allUnreadByUserId(ctx.owner.id);
	const views: NotificationView[] = [];
	for (const n of notifications) {
		views.push({
			id: n.id,
			messageHtml: markdownIt.render(n.message),
			level: n.level === NotificationLevel.Important ? 'warning' : 'info',
			closeUrl: notificationModel.closeUrl(n.id),
		});
	}

	return views;
}

// The role of this middleware is to inspect the system and to generate
// notifications for any issue it finds. It is only active for logged in users
// on the website. It is inactive for API calls.
export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	ctx.notifications = [];

	try {
		if (isApiRequest(ctx)) return next();
		if (!ctx.owner) return next();

		await handleChangeAdminPasswordNotification(ctx);
		await handleSqliteInProdNotification(ctx);
		ctx.notifications = await makeNotificationViews(ctx);
	} catch (error) {
		logger.error(error);
	}

	return next();
}
