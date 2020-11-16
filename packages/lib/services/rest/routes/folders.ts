
import { Request } from '../Api';
import defaultAction from '../utils/defaultAction';
import paginatedResults from '../utils/paginatedResults';
import BaseModel from '../../../BaseModel';
import requestFields from '../utils/requestFields';
const Folder = require('../../../models/Folder');
const { FoldersScreenUtils } = require('../../../folders-screen-utils.js');
const { ErrorNotFound } = require('../utils/errors');

export default async function(request: Request, id: string = null, link: string = null) {
	if (request.method === 'GET' && !id) {
		if (request.query.as_tree) {
			const folders = await FoldersScreenUtils.allForDisplay({ fields: requestFields(request, BaseModel.TYPE_FOLDER) });
			const output = await Folder.allAsTree(folders);
			return output;
		} else {
			return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
		}
	}

	if (request.method === 'GET' && id) {
		if (link && link === 'notes') {
			const folder = await Folder.load(id);
			return paginatedResults(BaseModel.TYPE_NOTE, request, { sql: 'parent_id = ?', params: [folder.id] });
		} else if (link) {
			throw new ErrorNotFound();
		}
	}

	return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
}
