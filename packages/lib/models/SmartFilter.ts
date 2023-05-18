// Not used??

import BaseModel from '../BaseModel';

export default class SmartFilter extends BaseModel {
	public static tableName(): string {
		throw new Error('Not using database');
	}

	public static modelType() {
		return BaseModel.TYPE_SMART_FILTER;
	}
}
