// Not used??

import BaseModel from '../BaseModel';

export default class SmartFilter extends BaseModel {
	static tableName(): string {
		throw new Error('Not using database');
	}

	static modelType() {
		return BaseModel.TYPE_SMART_FILTER;
	}
}
