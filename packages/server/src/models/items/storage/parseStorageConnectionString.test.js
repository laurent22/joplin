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
const types_1 = require("../../../utils/types");
const parseStorageConnectionString_1 = require("./parseStorageConnectionString");
describe('parseStorageConnectionString', function () {
    test('should parse a connection string', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const testCases = {
                'Type=Database': {
                    type: types_1.StorageDriverType.Database,
                },
                ' Type = Database ': {
                    type: types_1.StorageDriverType.Database,
                },
                'Type=Filesystem; Path=/path/to/dir': {
                    type: types_1.StorageDriverType.Filesystem,
                    path: '/path/to/dir',
                },
                ' Type = Filesystem  ;  Path  = /path/to/dir ': {
                    type: types_1.StorageDriverType.Filesystem,
                    path: '/path/to/dir',
                },
                'Type=Memory;': {
                    type: types_1.StorageDriverType.Memory,
                },
                '': null,
            };
            for (const [connectionString, config] of Object.entries(testCases)) {
                const actual = (0, parseStorageConnectionString_1.default)(connectionString);
                expect(actual).toEqual(config);
            }
        });
    });
    test('should detect errors', function () {
        return __awaiter(this, void 0, void 0, function* () {
            expect(() => (0, parseStorageConnectionString_1.default)('Path=/path/to/dir')).toThrow(); // Type is missing
            expect(() => (0, parseStorageConnectionString_1.default)('Type=')).toThrow();
            expect(() => (0, parseStorageConnectionString_1.default)('Type;')).toThrow();
            expect(() => (0, parseStorageConnectionString_1.default)('Type=DoesntExist')).toThrow();
            expect(() => (0, parseStorageConnectionString_1.default)('Type=Filesystem')).toThrow();
        });
    });
});
//# sourceMappingURL=parseStorageConnectionString.test.js.map