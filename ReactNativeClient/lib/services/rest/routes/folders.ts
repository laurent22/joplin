
import { Request } from '../Api';
import paginatedResults from '../paginatedResults';
const Folder = require('lib/models/Folder');
const BaseModel = require('lib/BaseModel').default;
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { ErrorNotFound } = require('../errors');

export default async function(request:Request, id:string = null, link:string = null) {
	// const pagination = this.requestPaginationOptions(request);

	if (request.method === 'GET' && !id) {
		if (request.query.as_tree) {
			const folders = await FoldersScreenUtils.allForDisplay({ fields: this.fields_(request, BaseModel.TYPE_FOLDER) });
			const output = await Folder.allAsTree(folders);
			return output;
		} else {
			return this.defaultAction_(BaseModel.TYPE_FOLDER, request, id, link);
		}
	}

	if (request.method === 'GET' && id) {
		if (link && link === 'notes') {
			const folder = await Folder.load(id);
			return paginatedResults(BaseModel.TYPE_NOTE, request, `parent_id = "${folder.id}"`);
			// const options = this.notePreviewsOptions_(request);
			// return Note.previews(id, options);
		} else if (link) {
			throw new ErrorNotFound();
		}
	}

	return this.defaultAction_(BaseModel.TYPE_FOLDER, request, id, link);
}
