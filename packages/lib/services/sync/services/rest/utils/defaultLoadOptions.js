"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const requestFields_1 = require("./requestFields");
function default_1(request, modelType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const options = {};
    const fields = (0, requestFields_1.default)(request, modelType);
    if (fields.length)
        options.fields = fields;
    return options;
}
