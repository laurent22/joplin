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
const utils_1 = require("./utils");
describe('services/email/utils', function () {
    test('markdownBodyToHtml should convert URLs to clickable links', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                ['Click this: [link](https://joplinapp.org)', '<p>Click this: <a href="https://joplinapp.org">link</a></p>'],
                ['Click this: https://joplinapp.org', '<p>Click this: <a href="https://joplinapp.org">https://joplinapp.org</a></p>'],
            ];
            for (const testCase of testCases) {
                const [input, expected] = testCase;
                const actual = (0, utils_1.markdownBodyToHtml)(input);
                expect(actual.trim()).toBe(expected.trim());
            }
        });
    });
    test('markdownBodyToPlainText should convert links to plain URLs', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                ['Click this: [link](https://joplinapp.org)', 'Click this: https://joplinapp.org'],
                ['Click this: https://joplinapp.org', 'Click this: https://joplinapp.org'],
            ];
            for (const testCase of testCases) {
                const [input, expected] = testCase;
                const actual = (0, utils_1.markdownBodyToPlainText)(input);
                expect(actual.trim()).toBe(expected.trim());
            }
        });
    });
});
//# sourceMappingURL=utils.test.js.map