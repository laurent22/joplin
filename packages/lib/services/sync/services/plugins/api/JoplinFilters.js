"use strict";
/* eslint-disable multiline-comment-style */
Object.defineProperty(exports, "__esModule", { value: true });
const eventManager_1 = require("../../../eventManager");
/**
 * @ignore
 *
 * Not sure if it's the best way to hook into the app
 * so for now disable filters.
 */
class JoplinFilters {
    async on(name, callback) {
        eventManager_1.default.filterOn(name, callback);
    }
    async off(name, callback) {
        eventManager_1.default.filterOff(name, callback);
    }
}
exports.default = JoplinFilters;
