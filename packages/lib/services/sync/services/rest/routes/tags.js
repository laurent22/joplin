"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const defaultAction_1 = require("../utils/defaultAction");
const BaseModel_1 = require("../../../BaseModel");
const defaultLoadOptions_1 = require("../utils/defaultLoadOptions");
const Api_1 = require("../Api");
const collectionToPaginatedResults_1 = require("../utils/collectionToPaginatedResults");
const Note_1 = require("../../../models/Note");
const Tag_1 = require("../../../models/Tag");
const { ErrorBadRequest, ErrorNotFound } = require('../utils/errors');
async function default_1(request, id = null, link = null) {
    if (link === 'notes') {
        const tag = await Tag_1.default.load(id);
        if (!tag)
            throw new ErrorNotFound();
        if (request.method === Api_1.RequestMethod.POST) {
            const note = request.bodyJson();
            if (!note || !note.id)
                throw new ErrorBadRequest('Missing note ID');
            return await Tag_1.default.addNote(tag.id, note.id);
        }
        if (request.method === 'DELETE') {
            const noteId = request.params.length ? request.params[0] : null;
            if (!noteId)
                throw new ErrorBadRequest('Missing note ID');
            await Tag_1.default.removeNote(tag.id, noteId);
            return;
        }
        if (request.method === 'GET') {
            // Ideally we should get all this in one SQL query but for now that will do
            const noteIds = await Tag_1.default.noteIds(tag.id);
            const output = [];
            for (let i = 0; i < noteIds.length; i++) {
                const n = await Note_1.default.preview(noteIds[i], (0, defaultLoadOptions_1.default)(request, BaseModel_1.ModelType.Note));
                if (!n)
                    continue;
                output.push(n);
            }
            return (0, collectionToPaginatedResults_1.default)(BaseModel_1.ModelType.Note, output, request);
        }
    }
    return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_TAG, request, id, link);
}
