import { Request, RequestMethod } from '../Api';
import defaultSaveOptions from './defaultSaveOptions';
import { ErrorMethodNotAllowed, ErrorNotFound } from './errors';
import paginatedResults from './paginatedResults';
import readonlyProperties from './readonlyProperties';
const BaseItem = require('lib/models/BaseItem');

export default async function(modelType:number, request:Request, id:string = null, link:string = null) {
	if (link) throw new ErrorNotFound(); // Default action doesn't support links at all for now

	const ModelClass = BaseItem.getClassByItemType(modelType);

	const getOneModel = async () => {
		const model = await ModelClass.load(id);
		if (!model) throw new ErrorNotFound();
		return model;
	};

	if (request.method === 'GET') {
		if (id) {
			return getOneModel();
		} else {
			return paginatedResults(modelType, request);
		}
	}

	if (request.method === 'PUT' && id) {
		const model = await getOneModel();
		let newModel = Object.assign({}, model, request.bodyJson(readonlyProperties('PUT')));
		newModel = await ModelClass.save(newModel, { userSideValidation: true });
		return newModel;
	}

	if (request.method === 'DELETE' && id) {
		const model = await getOneModel();
		await ModelClass.delete(model.id);
		return;
	}

	if (request.method === RequestMethod.POST) {
		const props = readonlyProperties('POST');
		const idIdx = props.indexOf('id');
		if (idIdx >= 0) props.splice(idIdx, 1);
		const model = request.bodyJson(props);
		const result = await ModelClass.save(model, defaultSaveOptions('POST', model.id));
		return result;
	}

	throw new ErrorMethodNotAllowed();
}
