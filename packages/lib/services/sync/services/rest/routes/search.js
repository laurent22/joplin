"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const BaseModel_1 = require("../../../BaseModel");
const defaultLoadOptions_1 = require("../utils/defaultLoadOptions");
const errors_1 = require("../utils/errors");
const requestFields_1 = require("../utils/requestFields");
const collectionToPaginatedResults_1 = require("../utils/collectionToPaginatedResults");
const BaseItem_1 = require("../../../models/BaseItem");
const SearchEngineUtils_1 = require("../../search/SearchEngineUtils");
async function default_1(request) {
    if (request.method !== 'GET')
        throw new errors_1.ErrorMethodNotAllowed();
    const query = request.query.query;
    if (!query)
        throw new errors_1.ErrorBadRequest('Missing "query" parameter');
    const modelType = request.query.type ? BaseModel_1.default.modelNameToType(request.query.type) : BaseModel_1.default.TYPE_NOTE;
    let results = [];
    if (modelType !== BaseItem_1.default.TYPE_NOTE) {
        const ModelClass = BaseItem_1.default.getClassByItemType(modelType);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        const options = {};
        const fields = (0, requestFields_1.default)(request, modelType);
        if (fields.length)
            options.fields = fields;
        const sqlQueryPart = query.replace(/\*/g, '%');
        options.where = 'title LIKE ?';
        options.whereParams = [sqlQueryPart];
        options.caseInsensitive = true;
        results = await ModelClass.all(options);
    }
    else {
        const options = Object.assign(Object.assign({}, (0, defaultLoadOptions_1.default)(request, BaseModel_1.ModelType.Note)), { appendWildCards: true });
        results = (await SearchEngineUtils_1.default.notesForQuery(query, false, options)).notes;
    }
    // We do not sort the results if the "order_by" query parameter is not specified, because the
    // search engine has already sorted them in order of relevance.
    // https://github.com/laurent22/joplin/issues/10088
    return (0, collectionToPaginatedResults_1.default)(modelType, results, request, { sort: !!request.query.order_by });
}
