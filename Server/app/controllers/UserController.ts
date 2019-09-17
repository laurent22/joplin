import { User } from '../db';
import UserModel from '../models/UserModel';
import BaseController from './BaseController';

export default class UserController extends BaseController {

	async createUser(sessionId:string, email:string, password:string, options:User = {}):Promise<User> {
		await this.initSession(sessionId, true);
		const userModel = new UserModel();
		const user = await userModel.createUser(email, password, options);
		return user;
	}

}
