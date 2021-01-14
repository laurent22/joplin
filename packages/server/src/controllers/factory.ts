import { Models } from '../models/factory';
// import OAuthController from './api/OAuthController';
import SessionController from './api/SessionController';
import IndexLoginController from './index/LoginController';
import IndexHomeController from './index/HomeController';
import IndexUserController from './index/UserController';
import IndexFileController from './index/FileController';
import IndexNotificationController from './index/NotificationController';

export class Controllers {

	private models_: Models;

	public constructor(models: Models) {
		this.models_ = models;
	}

	// public oauth() {
	// 	return new OAuthController(this.models_);
	// }

	public apiSession() {
		return new SessionController(this.models_);
	}

	public indexLogin() {
		return new IndexLoginController(this.models_);
	}

	public indexHome() {
		return new IndexHomeController(this.models_);
	}

	public indexUser() {
		return new IndexUserController(this.models_);
	}

	public indexFiles() {
		return new IndexFileController(this.models_);
	}

	public indexNotifications() {
		return new IndexNotificationController(this.models_);
	}

}

export default function(models: Models) {
	return new Controllers(models);
}
