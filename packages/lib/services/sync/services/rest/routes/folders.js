"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const Api_1 = require("../Api");
const defaultAction_1 = require("../utils/defaultAction");
const paginatedResults_1 = require("../utils/paginatedResults");
const BaseModel_1 = require("../../../BaseModel");
const requestFields_1 = require("../utils/requestFields");
const Folder_1 = require("../../../models/Folder");
const folders_screen_utils_1 = require("../../../folders-screen-utils");
const { ErrorNotFound } = require('../utils/errors');
async function default_1(request, id = null, link = null) {
    if (request.method === Api_1.RequestMethod.GET && !id) {
        if (request.query.as_tree) {
            const folders = await (0, folders_screen_utils_1.allForDisplay)({
                fields: (0, requestFields_1.default)(request, BaseModel_1.default.TYPE_FOLDER),
                includeDeleted: false,
            });
            const output = await Folder_1.default.allAsTree(folders);
            return output;
        }
        else {
            return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_FOLDER, request, id, link, null, { sql: 'deleted_time = 0' });
        }
    }
    if (request.method === Api_1.RequestMethod.GET && id) {
        if (link && link === 'notes') {
            const folder = await Folder_1.default.load(id);
            return (0, paginatedResults_1.default)(BaseModel_1.default.TYPE_NOTE, request, { sql: 'parent_id = ? AND deleted_time = 0', params: [folder.id] });
        }
        else if (link) {
            throw new ErrorNotFound();
        }
    }
    if (request.method === Api_1.RequestMethod.DELETE) {
        await Folder_1.default.delete(id, { toTrash: request.query.permanent !== '1', sourceDescription: 'api/folders DELETE' });
        return;
    }
    return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_FOLDER, request, id, link);
}
