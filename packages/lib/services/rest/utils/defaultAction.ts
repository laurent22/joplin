import { Request, RequestMethod } from '../Api';
import defaultSaveOptions from './defaultSaveOptions';
import { ErrorMethodNotAllowed, ErrorNotFound } from './errors';
import paginatedResults from './paginatedResults';
import readonlyProperties from './readonlyProperties';
import requestFields from './requestFields';
import BaseItem from '../../../models/BaseItem';
import { WhereQuery } from '../../../models/utils/paginatedFeed';

export default async function(modelType: number, request: Request, id: string = null, link: string = null, defaultFields: string[] = null, whereQuery: WhereQuery = null) {
	if (link) throw new ErrorNotFound(); // Default action doesn't support links at all for now

	const ModelClass = BaseItem.getClassByItemType(modelType);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const getOneModel = async (options: any = null) => {
		const model = await ModelClass.load(id, options || {});
		if (!model) throw new ErrorNotFound();
		return model;
	};

	if (request.method === 'GET') {
		if (id) {
			return getOneModel({
				fields: requestFields(request, modelType, defaultFields),
			});
		} else {
			return paginatedResults(modelType, request, whereQuery, defaultFields);
		}
	}

	if (request.method === 'PUT' && id) {
		const model = await getOneModel();
		const newModel = { ...model, ...request.bodyJson(readonlyProperties('PUT')) };
		return ModelClass.save(newModel, { userSideValidation: true });
	}

	if (request.method === 'DELETE' && id) {
		const model = await getOneModel();
		await ModelClass.delete(model.id, { source: 'API: DELETE method' });
		return;
	}

	if (request.method === RequestMethod.POST) {
		const props = readonlyProperties('POST');
		const idIdx = props.indexOf('id');
		if (idIdx >= 0) props.splice(idIdx, 1);
		const model = request.bodyJson(props);
		return ModelClass.save(model, defaultSaveOptions('POST', model.id));
	}

	throw new ErrorMethodNotAllowed();
}
