"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const BaseModel_1 = require("../../../BaseModel");
const shim_1 = require("../../../shim");
const Api_1 = require("../Api");
const defaultAction_1 = require("../utils/defaultAction");
const errors_1 = require("../utils/errors");
const readonlyProperties_1 = require("../utils/readonlyProperties");
const ApiResponse_1 = require("../ApiResponse");
const NoteResource_1 = require("../../../models/NoteResource");
const collectionToPaginatedResults_1 = require("../utils/collectionToPaginatedResults");
const defaultLoadOptions_1 = require("../utils/defaultLoadOptions");
const Resource_1 = require("../../../models/Resource");
const Note_1 = require("../../../models/Note");
async function default_1(request, id = null, link = null) {
    // fieldName: "data"
    // headers: Object
    // originalFilename: "test.jpg"
    // path: "C:\Users\Laurent\AppData\Local\Temp\BW77wkpP23iIGUstd0kDuXXC.jpg"
    // size: 164394
    if (request.method === 'GET') {
        if (link === 'file') {
            const resource = await Resource_1.default.load(id);
            if (!resource)
                throw new errors_1.ErrorNotFound();
            const filePath = Resource_1.default.fullPath(resource);
            const buffer = await shim_1.default.fsDriver().readFile(filePath, 'Buffer');
            const response = new ApiResponse_1.default();
            response.type = 'attachment';
            response.body = buffer;
            response.contentType = resource.mime;
            response.attachmentFilename = Resource_1.default.friendlyFilename(resource);
            return response;
        }
        if (link === 'notes') {
            const noteIds = await NoteResource_1.default.associatedNoteIds(id);
            const loadOptions = (0, defaultLoadOptions_1.default)(request, BaseModel_1.default.TYPE_NOTE);
            const notes = [];
            for (const noteId of noteIds) {
                notes.push(await Note_1.default.load(noteId, loadOptions));
            }
            return (0, collectionToPaginatedResults_1.default)(BaseModel_1.ModelType.Note, notes, request);
        }
        if (link)
            throw new errors_1.ErrorNotFound();
    }
    if (request.method === Api_1.RequestMethod.POST || request.method === Api_1.RequestMethod.PUT) {
        const isUpdate = request.method === Api_1.RequestMethod.PUT;
        if (!request.files.length) {
            if (request.method === Api_1.RequestMethod.PUT) {
                // In that case, we don't try to update the resource blob, we
                // just update the properties.
                return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_RESOURCE, request, id, link);
            }
            else {
                // If it's a POST request, the file content is required.
                throw new errors_1.ErrorBadRequest('Resource cannot be created without a file');
            }
        }
        if (isUpdate && !id)
            throw new errors_1.ErrorBadRequest('Missing resource ID');
        const filePath = request.files[0].path;
        const defaultProps = request.bodyJson((0, readonlyProperties_1.default)(request.method));
        return shim_1.default.createResourceFromPath(filePath, defaultProps, {
            userSideValidation: true,
            resizeLargeImages: 'never',
            destinationResourceId: isUpdate ? id : '',
        });
    }
    return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_RESOURCE, request, id, link);
}
