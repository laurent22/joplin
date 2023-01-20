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
const pagination_1 = require("./pagination");
describe('pagination', function () {
    test('should create options from request query parameters', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const d = (0, pagination_1.defaultPagination)();
            const testCases = [
                [
                    null,
                    d,
                ],
                [
                    {
                        order_by: 'title',
                    },
                    Object.assign(Object.assign({}, d), { order: [{
                                by: 'title',
                                dir: d.order[0].dir,
                            }] }),
                ],
                [
                    {
                        order_by: 'title',
                        order_dir: 'asc',
                    },
                    Object.assign(Object.assign({}, d), { order: [{
                                by: 'title',
                                dir: 'asc',
                            }] }),
                ],
                [
                    {
                        limit: 55,
                    },
                    Object.assign(Object.assign({}, d), { limit: 55 }),
                ],
                [
                    {
                        page: 3,
                    },
                    Object.assign(Object.assign({}, d), { page: 3 }),
                ],
            ];
            for (const t of testCases) {
                const input = t[0];
                const expected = t[1];
                const actual = (0, pagination_1.requestPagination)(input);
                expect(actual).toEqual(expected);
            }
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, pagination_1.requestPagination)({ order_dir: 'ASC' }); }));
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, pagination_1.requestPagination)({ order_dir: 'DESC' }); }));
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, pagination_1.requestPagination)({ page: 0 }); }));
        });
    });
    test('should create page link logic', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect((0, pagination_1.createPaginationLinks)(1, 5)).toEqual([
                { page: 1, isCurrent: true },
                { page: 2 },
                { page: 3 },
                { page: 4 },
                { page: 5 },
            ]);
            expect((0, pagination_1.createPaginationLinks)(3, 5)).toEqual([
                { page: 1 },
                { page: 2 },
                { page: 3, isCurrent: true },
                { page: 4 },
                { page: 5 },
            ]);
            expect((0, pagination_1.createPaginationLinks)(1, 10)).toEqual([
                { page: 1, isCurrent: true },
                { page: 2 },
                { page: 3 },
                { page: 4 },
                { page: 5 },
                { isEllipsis: true },
                { page: 9 },
                { page: 10 },
            ]);
            expect((0, pagination_1.createPaginationLinks)(10, 20)).toEqual([
                { page: 1 },
                { page: 2 },
                { isEllipsis: true },
                { page: 8 },
                { page: 9 },
                { page: 10, isCurrent: true },
                { page: 11 },
                { page: 12 },
                { isEllipsis: true },
                { page: 19 },
                { page: 20 },
            ]);
            expect((0, pagination_1.createPaginationLinks)(20, 20)).toEqual([
                { page: 1 },
                { page: 2 },
                { isEllipsis: true },
                { page: 18 },
                { page: 19 },
                { page: 20, isCurrent: true },
            ]);
        });
    });
});
//# sourceMappingURL=pagination.test.js.map