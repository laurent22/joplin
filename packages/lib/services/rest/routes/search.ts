import BaseModel, { ModelType } from '../../../BaseModel';
import { Request } from '../Api';
import defaultLoadOptions from '../utils/defaultLoadOptions';
import { ErrorBadRequest, ErrorMethodNotAllowed } from '../utils/errors';
import requestFields from '../utils/requestFields';
import collectionToPaginatedResults from '../utils/collectionToPaginatedResults';
import BaseItem from '../../../models/BaseItem';
import { NoteEntity } from '../../database/types';
import SearchEngineUtils, { NotesForQueryOptions } from '../../search/SearchEngineUtils';

export default async function(request: Request) {
	if (request.method !== 'GET') throw new ErrorMethodNotAllowed();

	const query = request.query.query;
	if (!query) throw new ErrorBadRequest('Missing "query" parameter');

	const modelType = request.query.type ? BaseModel.modelNameToType(request.query.type) : BaseModel.TYPE_NOTE;

	let results: NoteEntity[] = [];

	if (modelType !== BaseItem.TYPE_NOTE) {
		const ModelClass = BaseItem.getClassByItemType(modelType);
		const options: { fields?: string[]; where: string; whereParams: string[]; caseInsensitive: boolean } = {
			where: 'title LIKE ?',
			whereParams: [query.replace(/\*/g, '%')],
			caseInsensitive: true,
		};
		const fields = requestFields(request, modelType);
		if (fields.length) options.fields = fields;
		results = await ModelClass.all(options);
	} else {
		const loadOptions = defaultLoadOptions(request, ModelType.Note);
		const options: NotesForQueryOptions = {
			fields: Array.isArray(loadOptions.fields) ? loadOptions.fields : (loadOptions.fields ? [loadOptions.fields] : undefined),
			appendWildCards: true,
		};
		results = (await SearchEngineUtils.notesForQuery(query, false, options)).notes;
	}

	// We do not sort the results if the "order_by" query parameter is not specified, because the
	// search engine has already sorted them in order of relevance.
	// https://github.com/laurent22/joplin/issues/10088
	return collectionToPaginatedResults(modelType, results, request, { sort: !!request.query.order_by });
}
