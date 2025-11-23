"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = readonlyProperties;
function readonlyProperties(requestMethod) {
    const output = ['created_time', 'updated_time', 'encryption_blob_encrypted', 'encryption_applied', 'encryption_cipher_text'];
    if (requestMethod !== 'POST')
        output.splice(0, 0, 'id');
    return output;
}
