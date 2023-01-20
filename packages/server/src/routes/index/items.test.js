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
const testUtils_1 = require("../../utils/testing/testUtils");
const apiUtils_1 = require("../../utils/testing/apiUtils");
describe('index_items', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_items');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should list the user items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const items = {};
            for (let i = 1; i <= 150; i++) {
                items[(`${i}`).padStart(32, '0')] = {};
            }
            yield (0, testUtils_1.createItemTree)(user1.id, '', items);
            // Just some basic tests to check that we're seeing at least the first
            // and last item of each page. And that the navigation bar is there with
            // the right elements.
            {
                const response = yield (0, apiUtils_1.execRequest)(session1.id, 'GET', 'items');
                const navLinks = (0, testUtils_1.parseHtml)(response).querySelectorAll('.pagination-link');
                expect(response.includes('00000000000000000000000000000001.md')).toBe(true);
                expect(response.includes('00000000000000000000000000000100.md')).toBe(true);
                expect(navLinks.length).toBe(2);
                expect(navLinks[0].getAttribute('class')).toContain('is-current');
                expect(navLinks[1].getAttribute('class')).not.toContain('is-current');
            }
            {
                const response = yield (0, apiUtils_1.execRequest)(session1.id, 'GET', 'items', null, { query: { page: 2 } });
                const navLinks = (0, testUtils_1.parseHtml)(response).querySelectorAll('.pagination-link');
                expect(response.includes('00000000000000000000000000000101.md')).toBe(true);
                expect(response.includes('00000000000000000000000000000150.md')).toBe(true);
                expect(navLinks.length).toBe(2);
                expect(navLinks[0].getAttribute('class')).not.toContain('is-current');
                expect(navLinks[1].getAttribute('class')).toContain('is-current');
            }
        });
    });
});
//# sourceMappingURL=items.test.js.map