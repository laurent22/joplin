
import { Request, RequestMethod } from '../Api';
import defaultAction from '../utils/defaultAction';
import paginatedResults from '../utils/paginatedResults';
import BaseModel from '../../../BaseModel';
import requestFields from '../utils/requestFields';
import Folder from '../../../models/Folder';
import { allForDisplay } from '../../../folders-screen-utils';
import isNoteLockEnabled from '../../noteLock/isNoteLockEnabled';
const { ErrorForbidden, ErrorNotFound } = require('../utils/errors');

export default async function(request: Request, id: string = null, link: string = null) {
	const includeDeleted = request.query.include_deleted === '1';
	if (request.method === RequestMethod.GET && !id) {

		if (request.query.as_tree) {
			const folders = await allForDisplay({
				fields: requestFields(request, BaseModel.TYPE_FOLDER),
				includeDeleted,
			});
			const output = await Folder.allAsTree(folders);
			return output;
		} else {
			return defaultAction(BaseModel.TYPE_FOLDER, request, id, link, null, includeDeleted ? null : { sql: 'deleted_time = 0' });
		}
	}

	if (request.method === RequestMethod.GET && id) {
		if (link && link === 'notes') {
			const folder = await Folder.load(id);
			if (!folder) throw new ErrorNotFound();
			let sql = includeDeleted ? 'parent_id = ?' : 'parent_id = ? AND deleted_time = 0';
			if (isNoteLockEnabled()) sql += ' AND is_locked = 0';
			return paginatedResults(BaseModel.TYPE_NOTE, request, { sql, params: [folder.id] });
		} else if (link) {
			throw new ErrorNotFound();
		}
	}

	if (request.method === RequestMethod.DELETE) {
		await Folder.delete(id, { toTrash: request.query.permanent !== '1', sourceDescription: 'api/folders DELETE' });
		return;
	}

	if (isNoteLockEnabled() && request.method === RequestMethod.PUT && id) {
		const folder = await Folder.load(id, { fields: ['id', 'share_id', 'is_shared'] });
		const newProps = request.bodyJson();
		if (folder) {
			// The next sync would upload these markers and attach the folder tree to the share.
			const gainsShareId = 'share_id' in newProps && !!newProps.share_id && newProps.share_id !== folder.share_id;
			const gainsIsShared = 'is_shared' in newProps && !!Folder.filter({ is_shared: newProps.is_shared }).is_shared && !folder.is_shared;
			if ((gainsShareId || gainsIsShared) && await Folder.hasLockedNotes(id)) {
				throw new ErrorForbidden('The sharing state of a notebook that contains locked notes cannot be changed through the API');
			}
		}
	}

	return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
}
