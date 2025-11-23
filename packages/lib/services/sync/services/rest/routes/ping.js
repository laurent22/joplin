"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const errors_1 = require("../utils/errors");
async function default_1(request) {
    if (request.method === 'GET') {
        return 'JoplinClipperServer';
    }
    throw new errors_1.ErrorMethodNotAllowed();
}
