import BaseModel from './BaseModel';

export default class SessionModel extends BaseModel {

	static tableName():string {
		return 'sessions';
	}

}
