"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const BaseModel_1 = require("../../../BaseModel");
const defaultAction_1 = require("../utils/defaultAction");
function default_1(request, id = null, link = null) {
    return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_MASTER_KEY, request, id, link);
}
