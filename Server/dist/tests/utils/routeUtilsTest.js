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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var testUtils_1 = require("../testUtils");
var routeUtils_1 = require("../../app/utils/routeUtils");
var db_1 = require("../../app/db");
describe('routeUtils', function () {
    it('should parse a route path', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var testCases, _i, testCases_1, t, path, id, link, addressingType, parsed;
            return __generator(this, function (_a) {
                testCases = [
                    ['123456/content', '123456', 'content', db_1.ItemAddressingType.Id],
                    ['123456', '123456', '', db_1.ItemAddressingType.Id],
                    ['root:/Documents/MyFile.md:/content', 'root:/Documents/MyFile.md', 'content', db_1.ItemAddressingType.Path],
                    ['root:/Documents/MyFile.md', 'root:/Documents/MyFile.md', '', db_1.ItemAddressingType.Path],
                    ['', '', '', db_1.ItemAddressingType.Id],
                ];
                for (_i = 0, testCases_1 = testCases; _i < testCases_1.length; _i++) {
                    t = testCases_1[_i];
                    path = t[0];
                    id = t[1];
                    link = t[2];
                    addressingType = t[3];
                    parsed = routeUtils_1.parseSubPath(path);
                    expect(parsed.value).toBe(id);
                    expect(parsed.link).toBe(link);
                    expect(parsed.addressingType).toBe(addressingType);
                }
                return [2 /*return*/];
            });
        });
    }));
    it('should split an item path', testUtils_1.asyncTest(function () {
        return __awaiter(this, void 0, void 0, function () {
            var testCases, _i, testCases_2, t, path, expected, splitted;
            return __generator(this, function (_a) {
                testCases = [
                    ['root:/Documents/MyFile.md', ['root', 'Documents', 'MyFile.md']],
                    ['documents:/CV.doc', ['documents', 'CV.doc']],
                    ['', []],
                ];
                for (_i = 0, testCases_2 = testCases; _i < testCases_2.length; _i++) {
                    t = testCases_2[_i];
                    path = t[0];
                    expected = t[1];
                    splitted = routeUtils_1.splitItemPath(path);
                    expect(JSON.stringify(splitted)).toBe(JSON.stringify(expected));
                }
                return [2 /*return*/];
            });
        });
    }));
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInJvdXRlVXRpbHNUZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQXlDO0FBQ3pDLHlEQUF5RTtBQUN6RSxtQ0FBa0Q7QUFFbEQsUUFBUSxDQUFDLFlBQVksRUFBRTtJQUV0QixFQUFFLENBQUMsMkJBQTJCLEVBQUUscUJBQVMsQ0FBQzs7OztnQkFDbkMsU0FBUyxHQUFTO29CQUN2QixDQUFDLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsdUJBQWtCLENBQUMsRUFBRSxDQUFDO29CQUM5RCxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLHVCQUFrQixDQUFDLEVBQUUsQ0FBQztvQkFDL0MsQ0FBQyxvQ0FBb0MsRUFBRSwyQkFBMkIsRUFBRSxTQUFTLEVBQUUsdUJBQWtCLENBQUMsSUFBSSxDQUFDO29CQUN2RyxDQUFDLDJCQUEyQixFQUFFLDJCQUEyQixFQUFFLEVBQUUsRUFBRSx1QkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQ3ZGLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsdUJBQWtCLENBQUMsRUFBRSxDQUFDO2lCQUNuQyxDQUFDO2dCQUVGLFdBQXlCLEVBQVQsdUJBQVMsRUFBVCx1QkFBUyxFQUFULElBQVMsRUFBRTtvQkFBaEIsQ0FBQztvQkFDTCxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNaLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ1YsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDWixjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUV0QixNQUFNLEdBQUcseUJBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztpQkFDbkQ7Ozs7S0FDRCxDQUFDLENBQUMsQ0FBQztJQUVKLEVBQUUsQ0FBQywyQkFBMkIsRUFBRSxxQkFBUyxDQUFDOzs7O2dCQUNuQyxTQUFTLEdBQVM7b0JBQ3ZCLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFDO29CQUNqRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUM5QyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7aUJBQ1IsQ0FBQztnQkFFRixXQUF5QixFQUFULHVCQUFTLEVBQVQsdUJBQVMsRUFBVCxJQUFTLEVBQUU7b0JBQWhCLENBQUM7b0JBQ0wsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDWixRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNoQixRQUFRLEdBQUcsMEJBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFFckMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2lCQUNoRTs7OztLQUNELENBQUMsQ0FBQyxDQUFDO0FBRUwsQ0FBQyxDQUFDLENBQUMiLCJmaWxlIjoicm91dGVVdGlsc1Rlc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBhc3luY1Rlc3QgfSBmcm9tICcuLi90ZXN0VXRpbHMnO1xuaW1wb3J0IHsgcGFyc2VTdWJQYXRoLCBzcGxpdEl0ZW1QYXRoIH0gZnJvbSAnLi4vLi4vYXBwL3V0aWxzL3JvdXRlVXRpbHMnO1xuaW1wb3J0IHsgSXRlbUFkZHJlc3NpbmdUeXBlIH0gZnJvbSAnLi4vLi4vYXBwL2RiJztcblxuZGVzY3JpYmUoJ3JvdXRlVXRpbHMnLCBmdW5jdGlvbigpIHtcblxuXHRpdCgnc2hvdWxkIHBhcnNlIGEgcm91dGUgcGF0aCcsIGFzeW5jVGVzdChhc3luYyBmdW5jdGlvbigpIHtcblx0XHRjb25zdCB0ZXN0Q2FzZXM6YW55W10gPSBbXG5cdFx0XHRbJzEyMzQ1Ni9jb250ZW50JywgJzEyMzQ1NicsICdjb250ZW50JywgSXRlbUFkZHJlc3NpbmdUeXBlLklkXSxcblx0XHRcdFsnMTIzNDU2JywgJzEyMzQ1NicsICcnLCBJdGVtQWRkcmVzc2luZ1R5cGUuSWRdLFxuXHRcdFx0Wydyb290Oi9Eb2N1bWVudHMvTXlGaWxlLm1kOi9jb250ZW50JywgJ3Jvb3Q6L0RvY3VtZW50cy9NeUZpbGUubWQnLCAnY29udGVudCcsIEl0ZW1BZGRyZXNzaW5nVHlwZS5QYXRoXSxcblx0XHRcdFsncm9vdDovRG9jdW1lbnRzL015RmlsZS5tZCcsICdyb290Oi9Eb2N1bWVudHMvTXlGaWxlLm1kJywgJycsIEl0ZW1BZGRyZXNzaW5nVHlwZS5QYXRoXSxcblx0XHRcdFsnJywgJycsICcnLCBJdGVtQWRkcmVzc2luZ1R5cGUuSWRdLFxuXHRcdF07XG5cblx0XHRmb3IgKGNvbnN0IHQgb2YgdGVzdENhc2VzKSB7XG5cdFx0XHRjb25zdCBwYXRoID0gdFswXTtcblx0XHRcdGNvbnN0IGlkID0gdFsxXTtcblx0XHRcdGNvbnN0IGxpbmsgPSB0WzJdO1xuXHRcdFx0Y29uc3QgYWRkcmVzc2luZ1R5cGUgPSB0WzNdO1xuXG5cdFx0XHRjb25zdCBwYXJzZWQgPSBwYXJzZVN1YlBhdGgocGF0aCk7XG5cdFx0XHRleHBlY3QocGFyc2VkLnZhbHVlKS50b0JlKGlkKTtcblx0XHRcdGV4cGVjdChwYXJzZWQubGluaykudG9CZShsaW5rKTtcblx0XHRcdGV4cGVjdChwYXJzZWQuYWRkcmVzc2luZ1R5cGUpLnRvQmUoYWRkcmVzc2luZ1R5cGUpO1xuXHRcdH1cblx0fSkpO1xuXG5cdGl0KCdzaG91bGQgc3BsaXQgYW4gaXRlbSBwYXRoJywgYXN5bmNUZXN0KGFzeW5jIGZ1bmN0aW9uKCkge1xuXHRcdGNvbnN0IHRlc3RDYXNlczphbnlbXSA9IFtcblx0XHRcdFsncm9vdDovRG9jdW1lbnRzL015RmlsZS5tZCcsIFsncm9vdCcsICdEb2N1bWVudHMnLCAnTXlGaWxlLm1kJ11dLFxuXHRcdFx0Wydkb2N1bWVudHM6L0NWLmRvYycsIFsnZG9jdW1lbnRzJywgJ0NWLmRvYyddXSxcblx0XHRcdFsnJywgW11dLFxuXHRcdF07XG5cblx0XHRmb3IgKGNvbnN0IHQgb2YgdGVzdENhc2VzKSB7XG5cdFx0XHRjb25zdCBwYXRoID0gdFswXTtcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gdFsxXTtcblx0XHRcdGNvbnN0IHNwbGl0dGVkID0gc3BsaXRJdGVtUGF0aChwYXRoKTtcblxuXHRcdFx0ZXhwZWN0KEpTT04uc3RyaW5naWZ5KHNwbGl0dGVkKSkudG9CZShKU09OLnN0cmluZ2lmeShleHBlY3RlZCkpO1xuXHRcdH1cblx0fSkpO1xuXG59KTtcbiJdfQ==
