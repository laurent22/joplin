"use strict";
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeHtml = void 0;
const Entities = require('html-entities').AllHtmlEntities;
const htmlentities = new Entities().encode;
function escapeHtml(s) {
    return htmlentities(s);
}
exports.escapeHtml = escapeHtml;
//# sourceMappingURL=htmlUtils.js.map