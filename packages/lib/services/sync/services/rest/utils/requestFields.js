"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const BaseItem_1 = require("../../../models/BaseItem");
function defaultFieldsByModelType(modelType) {
    const ModelClass = BaseItem_1.default.getClassByItemType(modelType);
    const possibleFields = ['id', 'parent_id', 'title', 'deleted_time'];
    const output = [];
    for (const f of possibleFields) {
        if (ModelClass.hasField(f))
            output.push(f);
    }
    return output;
}
function default_1(request, modelType, defaultFields = null) {
    const getDefaults = () => {
        if (defaultFields)
            return defaultFields;
        return defaultFieldsByModelType(modelType);
    };
    const query = request.query;
    if (!query || !query.fields)
        return getDefaults();
    if (Array.isArray(query.fields))
        return query.fields.slice();
    const fields = query.fields
        .split(',')
        .map((f) => f.trim())
        .filter((f) => !!f);
    return fields.length ? fields : getDefaults();
}
