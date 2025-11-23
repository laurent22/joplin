"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class JoplinError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    constructor(message, code = null, details = null) {
        super(message);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
        this.code = null;
        this.details = '';
        this.code = code;
        this.details = details;
    }
}
exports.default = JoplinError;
