import { User } from '../db';
import UserModel from '../models/UserModel';
import BaseController from './BaseController';

export default class UserController extends BaseController {

	async createUser(sessionId:string, user:User):Promise<User> {
		await this.initSession(sessionId, true);
		const userModel = new UserModel();
		let newUser = await userModel.fromApiInput(user);
		// const user = await userModel.createUser(email, password, options);

		// TODO: When calling save(), check that all properties are valid
		// TODO: check permission when creating user
		// TODO: Check that user can't make himself admin
		// TODO: Check that user can't remove admin from himself

		newUser = await userModel.save(newUser);
		return userModel.toApiOutput(newUser);
	}

}
