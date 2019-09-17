import { User } from '../db';
import UserModel from '../models/UserModel';
import BaseController from './BaseController';

export default class UserController extends BaseController {

	async createUser(sessionId:string, email:string, password:string):Promise<User> {
		await this.initSession(sessionId, true);
		return UserModel.createUser(email, password);
	}

}
