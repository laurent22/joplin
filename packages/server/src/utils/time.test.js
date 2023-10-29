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
const testUtils_1 = require("./testing/testUtils");
const time_1 = require("./time");
describe('time', () => {
    it('should have correct interval durations', () => {
        expect(time_1.Second).toBe(1000);
        expect(time_1.Day).toBe(86400000);
        expect(time_1.Month).toBe(2592000000);
    });
    it('should parse durations', () => __awaiter(void 0, void 0, void 0, function* () {
        const d = (0, time_1.durationToMilliseconds)('PT10S');
        expect(d).toBe(10000);
        yield (0, testUtils_1.expectThrow)(() => (0, time_1.durationToMilliseconds)('notaduration'));
    }));
});
//# sourceMappingURL=time.test.js.map