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
const joplinUtils_1 = require("./joplinUtils");
const testUtils_1 = require("./testing/testUtils");
describe('joplinUtils', function () {
    it('should check if an item is encrypted', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                [true, { jop_encryption_applied: 1 }],
                [false, { jop_encryption_applied: 0 }],
                [true, { content: Buffer.from('JED01blablablabla', 'utf8') }],
                [false, { content: Buffer.from('plain text', 'utf8') }],
            ];
            for (const [expected, input] of testCases) {
                expect((0, joplinUtils_1.itemIsEncrypted)(input)).toBe(expected);
            }
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, joplinUtils_1.itemIsEncrypted)({ name: 'missing props' }); }));
        });
    });
});
//# sourceMappingURL=joplinUtils.test.js.map