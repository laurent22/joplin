import BaseModel, { ModelType } from '../../../BaseModel';
import shim from '../../../shim';
import { Request, RequestMethod } from '../Api';
import defaultAction from '../utils/defaultAction';
import { ErrorBadRequest, ErrorNotFound } from '../utils/errors';
import readonlyProperties from '../utils/readonlyProperties';
import ApiResponse from '../ApiResponse';
import NoteResource from '../../../models/NoteResource';
import collectionToPaginatedResults from '../utils/collectionToPaginatedResults';
import defaultLoadOptions from '../utils/defaultLoadOptions';
import Resource from '../../../models/Resource';
import Note from '../../../models/Note';

export default async function(request: Request, id: string = null, link: string = null) {
	// fieldName: "data"
	// headers: Object
	// originalFilename: "test.jpg"
	// path: "C:\Users\Laurent\AppData\Local\Temp\BW77wkpP23iIGUstd0kDuXXC.jpg"
	// size: 164394

	if (request.method === 'GET') {
		if (link === 'file') {
			const resource = await Resource.load(id);
			if (!resource) throw new ErrorNotFound();

			const filePath = Resource.fullPath(resource);
			const buffer = await shim.fsDriver().readFile(filePath, 'Buffer');

			const response = new ApiResponse();
			response.type = 'attachment';
			response.body = buffer;
			response.contentType = resource.mime;
			response.attachmentFilename = Resource.friendlyFilename(resource);
			return response;
		}

		if (link === 'notes') {
			const noteIds = await NoteResource.associatedNoteIds(id);
			const loadOptions = defaultLoadOptions(request, BaseModel.TYPE_NOTE);
			const notes = [];
			for (const noteId of noteIds) {
				notes.push(await Note.load(noteId, loadOptions));
			}
			return collectionToPaginatedResults(ModelType.Note, notes, request);
		}

		if (link) throw new ErrorNotFound();
	}

	if (request.method === RequestMethod.POST || request.method === RequestMethod.PUT) {
		const isUpdate = request.method === RequestMethod.PUT;

		if (!request.files.length) {
			if (request.method === RequestMethod.PUT) {
				// In that case, we don't try to update the resource blob, we
				// just update the properties.
				return defaultAction(BaseModel.TYPE_RESOURCE, request, id, link);
			} else {
				// If it's a POST request, the file content is required.
				throw new ErrorBadRequest('Resource cannot be created without a file');
			}
		}

		if (isUpdate && !id) throw new ErrorBadRequest('Missing resource ID');
		const filePath = request.files[0].path;
		const defaultProps = request.bodyJson(readonlyProperties(request.method));
		return shim.createResourceFromPath(filePath, defaultProps, {
			userSideValidation: true,
			resizeLargeImages: 'never',
			destinationResourceId: isUpdate ? id : '',
		});
	}

	return defaultAction(BaseModel.TYPE_RESOURCE, request, id, link);
}
