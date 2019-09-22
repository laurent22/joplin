import { User } from '../db';
import UserModel from '../models/UserModel';
import BaseController from './BaseController';

export default class UserController extends BaseController {

	async createUser(sessionId:string, user:User):Promise<User> {
		const owner = await this.initSession(sessionId, true);
		const userModel = new UserModel({ userId: owner.id });
		let newUser = await userModel.fromApiInput(user);
		newUser = await userModel.save(newUser);
		return userModel.toApiOutput(newUser);
	}

	async updateUser(sessionId:string, user:User):Promise<void> {
		const owner = await this.initSession(sessionId);
		const userModel = new UserModel({ userId: owner.id });
		const newUser = await userModel.fromApiInput(user);
		await userModel.save(newUser, { isNew: false });
	}

}
