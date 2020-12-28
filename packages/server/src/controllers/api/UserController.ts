import { User } from '../../db';
import BaseController from '../BaseController';

export default class UserController extends BaseController {

	public async postUser(sessionId: string, user: User): Promise<User> {
		const owner = await this.initSession(sessionId, true);
		const userModel = this.models.user({ userId: owner.id });
		let newUser = userModel.fromApiInput(user);
		newUser = await userModel.save(newUser);
		return userModel.toApiOutput(newUser);
	}

	public async getUser(sessionId: string, userId: string): Promise<User> {
		const owner = await this.initSession(sessionId);
		const userModel = this.models.user({ userId: owner.id });
		return userModel.toApiOutput(await userModel.load(userId));
	}

	public async patchUser(sessionId: string, user: User): Promise<void> {
		const owner = await this.initSession(sessionId);
		const userModel = this.models.user({ userId: owner.id });
		const newUser = userModel.fromApiInput(user);
		await userModel.save(newUser, { isNew: false });
	}

	public async deleteUser(sessionId: string, userId: string): Promise<void> {
		const user = await this.initSession(sessionId);
		const userModel = this.models.user({ userId: user.id });
		await userModel.delete(userId);
	}

}
