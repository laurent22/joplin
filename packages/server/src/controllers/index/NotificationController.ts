import BaseController from '../BaseController';
import { Notification } from '../../db';
import { ErrorNotFound } from '../../utils/errors';

export default class NotificationController extends BaseController {

	public async patchOne(sessionId: string, notificationId: string, notification: Notification): Promise<void> {
		const owner = await this.initSession(sessionId);
		const model = this.models.notification({ userId: owner.id });
		const existingNotification = await model.load(notificationId);
		if (!existingNotification) throw new ErrorNotFound();


		console.info('aaaaaaa', notification);
		const toSave: Notification = {};
		if ('read' in notification) toSave.read = notification.read;
		if (!Object.keys(toSave).length) return;

		toSave.id = notificationId;
		await model.save(toSave);
	}

}
