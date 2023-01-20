"use strict";
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
const bytes_1 = require("./bytes");
describe('bytes', function () {
    it('should convert bytes', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect(1 * bytes_1.KB).toBe(1024);
            expect(1 * bytes_1.MB).toBe(1048576);
            expect(1 * bytes_1.GB).toBe(1073741824);
        });
    });
    it('should display pretty bytes', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect((0, bytes_1.formatBytes)(100 * bytes_1.KB)).toBe('100 kB');
            expect((0, bytes_1.formatBytes)(200 * bytes_1.MB)).toBe('200 MB');
            expect((0, bytes_1.formatBytes)(3 * bytes_1.GB)).toBe('3 GB');
        });
    });
});
//# sourceMappingURL=bytes.test.js.map