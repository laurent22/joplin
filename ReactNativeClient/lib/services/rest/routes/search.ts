import BaseModel, { ModelType } from 'lib/BaseModel';
import { Request } from '../Api';
import defaultLoadOptions from '../defaultLoadOptions';
import { ErrorBadRequest, ErrorMethodNotAllowed } from '../errors';
import requestFields from '../requestFields';
const BaseItem = require('lib/models/BaseItem');
const SearchEngineUtils = require('lib/services/searchengine/SearchEngineUtils');

export default async function(request:Request) {
	if (request.method !== 'GET') throw new ErrorMethodNotAllowed();

	const query = request.query.query;
	if (!query) throw new ErrorBadRequest('Missing "query" parameter');

	const modelType = request.query.type ? BaseModel.modelNameToType(request.query.type) : BaseModel.TYPE_NOTE;

	let results = [];

	if (modelType !== BaseItem.TYPE_NOTE) {
		const ModelClass = BaseItem.getClassByItemType(modelType);
		const options:any = {};
		const fields = requestFields(request, modelType);
		if (fields.length) options.fields = fields;
		const sqlQueryPart = query.replace(/\*/g, '%');
		options.where = 'title LIKE ?';
		options.whereParams = [sqlQueryPart];
		options.caseInsensitive = true;
		results = await ModelClass.all(options);
	} else {
		results = await SearchEngineUtils.notesForQuery(query, defaultLoadOptions(request, ModelType.note));
	}

	return {
		rows: results,
		// TODO: implement cursor support
	};
}
