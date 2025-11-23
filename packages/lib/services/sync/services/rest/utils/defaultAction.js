"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const Api_1 = require("../Api");
const defaultSaveOptions_1 = require("./defaultSaveOptions");
const errors_1 = require("./errors");
const paginatedResults_1 = require("./paginatedResults");
const readonlyProperties_1 = require("./readonlyProperties");
const requestFields_1 = require("./requestFields");
const BaseItem_1 = require("../../../models/BaseItem");
async function default_1(modelType, request, id = null, link = null, defaultFields = null, whereQuery = null) {
    if (link)
        throw new errors_1.ErrorNotFound(); // Default action doesn't support links at all for now
    const ModelClass = BaseItem_1.default.getClassByItemType(modelType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const getOneModel = async (options = null) => {
        const model = await ModelClass.load(id, options || {});
        if (!model)
            throw new errors_1.ErrorNotFound();
        return model;
    };
    if (request.method === 'GET') {
        if (id) {
            return getOneModel({
                fields: (0, requestFields_1.default)(request, modelType, defaultFields),
            });
        }
        else {
            return (0, paginatedResults_1.default)(modelType, request, whereQuery, defaultFields);
        }
    }
    if (request.method === 'PUT' && id) {
        const model = await getOneModel();
        const newModel = Object.assign(Object.assign({}, model), request.bodyJson((0, readonlyProperties_1.default)('PUT')));
        return ModelClass.save(newModel, { userSideValidation: true });
    }
    if (request.method === 'DELETE' && id) {
        const model = await getOneModel();
        await ModelClass.delete(model.id, { source: 'API: DELETE method' });
        return;
    }
    if (request.method === Api_1.RequestMethod.POST) {
        const props = (0, readonlyProperties_1.default)('POST');
        const idIdx = props.indexOf('id');
        if (idIdx >= 0)
            props.splice(idIdx, 1);
        const model = request.bodyJson(props);
        return ModelClass.save(model, (0, defaultSaveOptions_1.default)('POST', model.id));
    }
    throw new errors_1.ErrorMethodNotAllowed();
}
