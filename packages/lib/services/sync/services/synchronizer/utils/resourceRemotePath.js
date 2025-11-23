"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { Dirnames } = require('./types');
exports.default = (resourceId) => {
    return `${Dirnames.Resources}/${resourceId}`;
};
