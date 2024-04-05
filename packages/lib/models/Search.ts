// This class doesn't appear to be used at all

import BaseModel from '../BaseModel';

export default class Search extends BaseModel {
	public static tableName(): string {
		throw new Error('Not using database');
	}

	public static modelType() {
		return BaseModel.TYPE_SEARCH;
	}

	public static keywords(query: string) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		let output: any = query.trim();
		output = output.split(/[\s\t\n]+/);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		output = output.filter((o: any) => !!o);
		return output;
	}
}
