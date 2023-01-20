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
const types_1 = require("../services/database/types");
const testUtils_1 = require("../utils/testing/testUtils");
const time_1 = require("../utils/time");
describe('EventModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('EventModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create an event', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.models)().event().create(types_1.EventType.TaskStarted, 'deleteExpiredTokens');
            const events = yield (0, testUtils_1.models)().event().all();
            expect(events.length).toBe(1);
            expect(events[0].type).toBe(types_1.EventType.TaskStarted);
            expect(events[0].name).toBe('deleteExpiredTokens');
        });
    });
    test('should get the latest event', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.models)().event().create(types_1.EventType.TaskStarted, 'deleteExpiredTokens');
            yield (0, time_1.msleep)(1);
            yield (0, testUtils_1.models)().event().create(types_1.EventType.TaskStarted, 'deleteExpiredTokens');
            const allEvents = (yield (0, testUtils_1.models)().event().all()).sort((a, b) => a.created_time < b.created_time ? -1 : +1);
            expect(allEvents[0].created_time).toBeLessThan(allEvents[1].created_time);
            const latest = yield (0, testUtils_1.models)().event().lastEventByTypeAndName(types_1.EventType.TaskStarted, 'deleteExpiredTokens');
            expect(latest.id).toBe(allEvents[1].id);
        });
    });
});
//# sourceMappingURL=EventModel.test.js.map