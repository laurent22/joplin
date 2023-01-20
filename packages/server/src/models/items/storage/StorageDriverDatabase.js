"use strict";
// This driver allows storing the content directly with the item row in the
// database (as a binary blob). For now the driver expects that the content is
// stored in the same table as the items, as it originally was.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("../../../utils/errors");
const types_1 = require("../../../utils/types");
const StorageDriverBase_1 = require("./StorageDriverBase");
class StorageDriverDatabase extends StorageDriverBase_1.default {
    constructor(id, config) {
        super(id, Object.assign({ type: types_1.StorageDriverType.Database }, config));
        this.handleReturnedRows_ = null;
        this.handleReturnedRows_ = config.dbClientType === types_1.DatabaseConfigClient.PostgreSQL;
    }
    write(itemId, content, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const returningOption = this.handleReturnedRows_ ? ['id'] : undefined;
            const updatedRows = yield context.models.item().db('items').update({ content }, returningOption).where('id', '=', itemId);
            if (!this.handleReturnedRows_)
                return;
            // Not possible because the ID is unique
            if (updatedRows.length > 1)
                throw new Error('Update more than one row');
            // Not possible either because the row is created before this handler is called, but still could happen
            if (!updatedRows.length)
                throw new Error(`No such item: ${itemId}`);
            // That would be weird
            if (updatedRows[0].id !== itemId)
                throw new Error(`Did not update the right row. Expected: ${itemId}. Got: ${updatedRows[0].id}`);
        });
    }
    read(itemId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield context.models.item().db('items').select('content').where('id', '=', itemId).first();
            // Calling code should only call this handler if the row exists, so if
            // we find it doesn't, it's an error.
            if (!row)
                throw new errors_1.CustomError(`No such row: ${itemId}`, errors_1.ErrorCode.NotFound);
            return row.content;
        });
    }
    delete(_itemId, _context) {
        return __awaiter(this, void 0, void 0, function* () {
            // noop because the calling code deletes the whole row, including the
            // content.
        });
    }
    exists(itemId, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const row = yield context.models.item().db('items').select('content').where('id', '=', itemId).first();
            return !!row && !!row.content;
        });
    }
}
exports.default = StorageDriverDatabase;
//# sourceMappingURL=StorageDriverDatabase.js.map