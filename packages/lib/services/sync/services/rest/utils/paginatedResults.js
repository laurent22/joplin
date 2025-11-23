"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const requestFields_1 = require("./requestFields");
const BaseModel_1 = require("../../../BaseModel");
const requestPaginationOptions_1 = require("./requestPaginationOptions");
const paginatedFeed_1 = require("../../../models/utils/paginatedFeed");
const BaseItem_1 = require("../../../models/BaseItem");
async function default_1(modelType, request, whereQuery = null, defaultFields = null) {
    const ModelClass = BaseItem_1.default.getClassByItemType(modelType);
    const fields = (0, requestFields_1.default)(request, modelType, defaultFields);
    const pagination = (0, requestPaginationOptions_1.default)(request);
    return (0, paginatedFeed_1.default)(BaseModel_1.default.db(), ModelClass.tableName(), pagination, whereQuery, fields);
}
