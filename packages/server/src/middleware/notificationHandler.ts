import { AppContext, KoaNext, NotificationView } from '../utils/types';
import { isApiRequest, contextSessionId } from '../utils/requestUtils';
import { defaultAdminEmail, defaultAdminPassword, NotificationLevel, User } from '../db';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/lib/Logger';
import * as MarkdownIt from 'markdown-it';

const logger = Logger.create('notificationHandler');

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	ctx.notifications = [];

	try {
		if (isApiRequest(ctx)) return next();

		const sessionId = contextSessionId(ctx);
		const user: User = await ctx.models.session().sessionUser(sessionId);
		if (!user) return next();

		const notificationModel = ctx.models.notification({ userId: user.id });

		if (user.is_admin) {
			const defaultAdmin = await ctx.models.user().login(defaultAdminEmail, defaultAdminPassword);

			if (defaultAdmin) {
				await notificationModel.add(
					'change_admin_password',
					NotificationLevel.Important,
					_('The default admin password is insecure and has not been changed! [Change it now](%s)', await ctx.models.user().profileUrl())
				);
			}
		}

		const markdownIt = new MarkdownIt();
		const notifications = await notificationModel.allUnreadByUserId(user.id);
		const views: NotificationView[] = [];
		for (const n of notifications) {
			views.push({
				id: n.id,
				messageHtml: markdownIt.render(n.message),
				level: n.level === NotificationLevel.Important ? 'warning' : 'info',
				closeUrl: notificationModel.closeUrl(n.id),
			});
		}

		ctx.notifications = views;
	} catch (error) {
		logger.error(error);
	}

	return next();
}
