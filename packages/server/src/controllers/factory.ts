import { Models } from '../models/factory';
import FileController from './api/FileController';
// import OAuthController from './api/OAuthController';
import SessionController from './api/SessionController';
import UserController from './api/UserController';
import IndexLoginController from './index/LoginController';
import IndexHomeController from './index/HomeController';
import IndexProfileController from './index/ProfileController';
import IndexUserController from './index/UserController';

export class Controllers {

	private models_: Models;

	public constructor(models: Models) {
		this.models_ = models;
	}

	public apiFile() {
		return new FileController(this.models_);
	}

	// public oauth() {
	// 	return new OAuthController(this.models_);
	// }

	public apiSession() {
		return new SessionController(this.models_);
	}

	public apiUser() {
		return new UserController(this.models_);
	}

	public indexLogin() {
		return new IndexLoginController(this.models_);
	}

	public indexHome() {
		return new IndexHomeController(this.models_);
	}

	public indexProfile() {
		return new IndexProfileController(this.models_, this.apiUser());
	}

	public indexUser() {
		return new IndexUserController(this.models_);
	}

}

export default function(models: Models) {
	return new Controllers(models);
}
