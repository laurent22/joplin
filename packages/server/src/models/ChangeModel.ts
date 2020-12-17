import BaseModel from './BaseModel';

export default class ChangeModel extends BaseModel {

	public get tableName(): string {
		return 'changes';
	}

}
