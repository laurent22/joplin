"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPassword = exports.hashPassword = void 0;
const bcrypt = require('bcryptjs');
function hashPassword(password) {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
}
exports.hashPassword = hashPassword;
function checkPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}
exports.checkPassword = checkPassword;
//# sourceMappingURL=auth.js.map