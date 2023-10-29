"use strict";
/* eslint-disable import/prefer-default-export */
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
exports.fetchWithRetry = void 0;
const time_1 = require("./time");
const node_fetch_1 = require("node-fetch");
const fetchWithRetry = (url, opts = null) => __awaiter(void 0, void 0, void 0, function* () {
    if (!opts)
        opts = {};
    let retry = opts && opts.retry || 3;
    while (retry > 0) {
        try {
            return (0, node_fetch_1.default)(url, opts);
        }
        catch (e) {
            if (opts && opts.callback) {
                opts.callback(retry);
            }
            retry = retry - 1;
            if (retry === 0) {
                throw e;
            }
            if (opts && opts.pause) {
                yield (0, time_1.msleep)(opts.pause);
            }
        }
    }
    return null;
});
exports.fetchWithRetry = fetchWithRetry;
//# sourceMappingURL=net.js.map