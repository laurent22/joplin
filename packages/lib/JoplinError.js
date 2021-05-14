"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class JoplinError extends Error {
    constructor(message, code = null, details = null) {
        super(message);
        this.code = null;
        this.details = '';
        this.code = code;
        this.details = details;
    }
}
exports.default = JoplinError;
//# sourceMappingURL=JoplinError.js.map