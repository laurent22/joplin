
import { Request, RequestMethod } from '../Api';
import defaultAction from '../utils/defaultAction';
import paginatedResults from '../utils/paginatedResults';
import BaseModel from '../../../BaseModel';
import requestFields from '../utils/requestFields';
import Folder from '../../../models/Folder';
import { allForDisplay } from '../../../folders-screen-utils';
const { ErrorNotFound } = require('../utils/errors');

export default async function(request: Request, id: string = null, link: string = null) {
	if (request.method === RequestMethod.GET && !id) {
		if (request.query.as_tree) {
			const folders = await allForDisplay({
				fields: requestFields(request, BaseModel.TYPE_FOLDER),
				includeDeleted: false,
			});
			const output = await Folder.allAsTree(folders);
			return output;
		} else {
			return defaultAction(BaseModel.TYPE_FOLDER, request, id, link, null, { sql: 'deleted_time = 0' });
		}
	}

	if (request.method === RequestMethod.GET && id) {
		if (link && link === 'notes') {
			const folder = await Folder.load(id);
			return paginatedResults(BaseModel.TYPE_NOTE, request, { sql: 'parent_id = ? AND deleted_time = 0', params: [folder.id] });
		} else if (link) {
			throw new ErrorNotFound();
		}
	}

	if (request.method === RequestMethod.DELETE) {
		await Folder.delete(id, { toTrash: request.query.permanent !== '1', sourceDescription: 'api/folders DELETE' });
		return;
	}

	return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
}
