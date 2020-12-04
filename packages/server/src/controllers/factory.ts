import { Models } from '../models/factory';
import FileController from './api/FileController';
import OAuthController from './api/OAuthController';
import SessionController from './api/SessionController';
import UserController from './api/UserController';

export class Controllers {

	private models_: Models;

	constructor(models: Models) {
		this.models_ = models;
	}

	public file() {
		return new FileController(this.models_);
	}

	public oauth() {
		return new OAuthController(this.models_);
	}

	public session() {
		return new SessionController(this.models_);
	}

	public user() {
		return new UserController(this.models_);
	}

}

export default function(models: Models) {
	return new Controllers(models);
}
