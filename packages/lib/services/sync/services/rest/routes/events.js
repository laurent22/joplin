"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const BaseModel_1 = require("../../../BaseModel");
const Api_1 = require("../Api");
const errors_1 = require("../utils/errors");
const ItemChange_1 = require("../../../models/ItemChange");
const requestFields_1 = require("../utils/requestFields");
async function default_1(request, id = null, _link = null) {
    if (request.method === Api_1.RequestMethod.GET) {
        const options = {
            limit: 100,
            fields: (0, requestFields_1.default)(request, BaseModel_1.ModelType.ItemChange, ['id', 'item_type', 'item_id', 'type', 'created_time']),
        };
        if (!id) {
            if (!('cursor' in request.query)) {
                return {
                    items: [],
                    has_more: false,
                    cursor: (await ItemChange_1.default.lastChangeId()).toString(),
                };
            }
            else {
                const cursor = Number(request.query.cursor);
                if (isNaN(cursor))
                    throw new errors_1.ErrorBadRequest(`Invalid cursor: ${request.query.cursor}`);
                const changes = await ItemChange_1.default.changesSinceId(cursor, options);
                return {
                    items: changes,
                    has_more: changes.length >= options.limit,
                    cursor: (changes.length ? changes[changes.length - 1].id : cursor).toString(),
                };
            }
        }
        else {
            const change = await ItemChange_1.default.load(id, { fields: options.fields });
            if (!change)
                throw new errors_1.ErrorNotFound();
            return change;
        }
    }
}
