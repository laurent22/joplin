"use strict";
/* eslint-disable @typescript-eslint/no-explicit-any */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsDriverDummy = void 0;
class FsDriverDummy {
    constructor() { }
    appendFileSync() { }
    readFile(_path, _encoding = 'utf8') {
        return '';
    }
}
exports.FsDriverDummy = FsDriverDummy;
//# sourceMappingURL=fs-driver-dummy.js.map