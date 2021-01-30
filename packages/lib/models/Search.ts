// This class doesn't appear to be used at all

import BaseModel from '../BaseModel';

export default class Search extends BaseModel {
	static tableName(): string {
		throw new Error('Not using database');
	}

	static modelType() {
		return BaseModel.TYPE_SEARCH;
	}

	static keywords(query: string) {
		let output: any = query.trim();
		output = output.split(/[\s\t\n]+/);
		output = output.filter((o: any) => !!o);
		return output;
	}
}
