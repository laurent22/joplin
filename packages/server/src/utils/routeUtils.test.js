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
const routeUtils_1 = require("./routeUtils");
const types_1 = require("../services/database/types");
const types_2 = require("./types");
const testUtils_1 = require("./testing/testUtils");
describe('routeUtils', function () {
    it('should parse a route path', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                ['123456/content', '123456', 'content', types_1.ItemAddressingType.Id],
                ['123456', '123456', '', types_1.ItemAddressingType.Id],
                ['root:/Documents/MyFile.md:/content', 'root:/Documents/MyFile.md:', 'content', types_1.ItemAddressingType.Path],
                ['root:/Documents/MyFile.md:', 'root:/Documents/MyFile.md:', '', types_1.ItemAddressingType.Path],
                ['', '', '', types_1.ItemAddressingType.Id],
            ];
            for (const t of testCases) {
                const path = t[0];
                const id = t[1];
                const link = t[2];
                const addressingType = t[3];
                const parsed = (0, routeUtils_1.parseSubPath)('', path);
                expect(parsed.id).toBe(id);
                expect(parsed.link).toBe(link);
                expect(parsed.addressingType).toBe(addressingType);
            }
        });
    });
    it('should find a matching route', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                ['/admin/organizations', {
                        route: 1,
                        basePath: 'admin/organizations',
                        subPath: {
                            id: '',
                            link: '',
                            addressingType: 1,
                            raw: '',
                            schema: 'admin/organizations',
                        },
                    }],
                ['/api/users/123', {
                        route: 2,
                        basePath: 'api/users',
                        subPath: {
                            id: '123',
                            link: '',
                            addressingType: 1,
                            raw: '123',
                            schema: 'api/users/:id',
                        },
                    }],
                ['/help', {
                        route: 3,
                        basePath: 'help',
                        subPath: {
                            id: '',
                            link: '',
                            addressingType: 1,
                            raw: '',
                            schema: 'help',
                        },
                    }],
            ];
            const routes = {
                'admin/organizations': 1,
                'api/users': 2,
                'help': 3,
            };
            for (const testCase of testCases) {
                const [path, expected] = testCase;
                const actual = (0, routeUtils_1.findMatchingRoute)(path, routes);
                expect(actual).toEqual(expected);
            }
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, routeUtils_1.findMatchingRoute)('help', routes); }));
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, routeUtils_1.findMatchingRoute)('api/users/123', routes); }));
        });
    });
    it('should split an item path', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                ['root:/Documents/MyFile.md:', ['root', 'Documents', 'MyFile.md']],
                ['documents:/CV.doc:', ['documents', 'CV.doc']],
                ['', []],
            ];
            for (const t of testCases) {
                const path = t[0];
                const expected = t[1];
                const splitted = (0, routeUtils_1.splitItemPath)(path);
                expect(JSON.stringify(splitted)).toBe(JSON.stringify(expected));
            }
        });
    });
    it('should check the request origin for API URLs', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                [
                    'https://example.com',
                    'https://example.com',
                    true,
                ],
                [
                    // Apache ProxyPreserveHost somehow converts https:// to http://
                    // but in this context it's valid as only the domain matters.
                    'http://example.com',
                    'https://example.com',
                    true,
                ],
                [
                    // With Apache ProxyPreserveHost, the request might be eg
                    // https://example.com/joplin/api/ping but the origin part, as
                    // forwarded by Apache will be https://example.com/api/ping
                    // (without /joplin). In that case the request is valid anyway
                    // since we only care about the domain.
                    'https://example.com',
                    'https://example.com/joplin',
                    true,
                ],
                [
                    'https://bad.com',
                    'https://example.com',
                    false,
                ],
                [
                    'http://bad.com',
                    'https://example.com',
                    false,
                ],
            ];
            for (const testCase of testCases) {
                const [requestOrigin, configBaseUrl, expected] = testCase;
                expect((0, routeUtils_1.isValidOrigin)(requestOrigin, configBaseUrl, types_2.RouteType.Api)).toBe(expected);
            }
        });
    });
    it('should check the request origin for User Content URLs', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                [
                    'https://usercontent.local',
                    'https://usercontent.local',
                    true,
                ],
                [
                    'http://usercontent.local',
                    'https://usercontent.local',
                    true,
                ],
                [
                    'https://abcd.usercontent.local',
                    'https://usercontent.local',
                    true,
                ],
                [
                    'https://bad.local',
                    'https://usercontent.local',
                    false,
                ],
            ];
            for (const testCase of testCases) {
                const [requestOrigin, configBaseUrl, expected] = testCase;
                expect((0, routeUtils_1.isValidOrigin)(requestOrigin, configBaseUrl, types_2.RouteType.UserContent)).toBe(expected);
            }
        });
    });
    it('should check if a URL matches a schema', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = [
                [
                    'https://test.com/items/123/children',
                    'items/:id/children',
                    true,
                ],
                [
                    'https://test.com/items/123',
                    'items/:id',
                    true,
                ],
                [
                    'https://test.com/items',
                    'items',
                    true,
                ],
                [
                    'https://test.com/items/123/children',
                    'items/:id',
                    false,
                ],
                [
                    '',
                    'items/:id',
                    false,
                ],
            ];
            for (const testCase of testCases) {
                const [url, schema, expected] = testCase;
                const actual = (0, routeUtils_1.urlMatchesSchema)(url, schema);
                expect(actual).toBe(expected);
            }
        });
    });
});
//# sourceMappingURL=routeUtils.test.js.map