"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const defaultAction_1 = require("../utils/defaultAction");
const BaseModel_1 = require("../../../BaseModel");
async function default_1(request, id = null, link = null) {
    return (0, defaultAction_1.default)(BaseModel_1.ModelType.Revision, request, id, link, ['id']);
}
