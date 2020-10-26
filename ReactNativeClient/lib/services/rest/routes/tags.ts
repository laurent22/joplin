import defaultAction from '../defaultAction';
import BaseModel, { ModelType } from 'lib/BaseModel';
import defaultLoadOptions from '../defaultLoadOptions';
import { Request, RequestMethod } from '../Api';
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const { ErrorBadRequest, ErrorNotFound } = require('../errors');

export default async function(request:Request, id:string = null, link:string = null) {
	if (link === 'notes') {
		const tag = await Tag.load(id);
		if (!tag) throw new ErrorNotFound();

		if (request.method === RequestMethod.POST) {
			const note = request.bodyJson();
			if (!note || !note.id) throw new ErrorBadRequest('Missing note ID');
			return await Tag.addNote(tag.id, note.id);
		}

		if (request.method === 'DELETE') {
			const noteId = request.params.length ? request.params[0] : null;
			if (!noteId) throw new ErrorBadRequest('Missing note ID');
			await Tag.removeNote(tag.id, noteId);
			return;
		}

		if (request.method === 'GET') {
			// Ideally we should get all this in one SQL query but for now that will do
			const noteIds = await Tag.noteIds(tag.id);
			const output = [];
			for (let i = 0; i < noteIds.length; i++) {
				const n = await Note.preview(noteIds[i], defaultLoadOptions(request, ModelType.note));
				if (!n) continue;
				output.push(n);
			}
			return { rows: output }; // TODO: paginate
		}
	}

	return defaultAction(BaseModel.TYPE_TAG, request, id, link);
}
