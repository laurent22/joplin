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
const testUtils_1 = require("../utils/testing/testUtils");
const types_1 = require("../services/database/types");
const NotificationModel_1 = require("./NotificationModel");
describe('NotificationModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('NotificationModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should require a user to create the notification', function () {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, testUtils_1.expectThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().notification().add('', NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Normal, NotificationModel_1.NotificationKey.EmailConfirmed); }));
        });
    });
    test('should create a notification', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const model = (0, testUtils_1.models)().notification();
            yield model.add(user.id, NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Important, 'testing');
            const n = yield model.loadByKey(user.id, NotificationModel_1.NotificationKey.EmailConfirmed);
            expect(n.key).toBe(NotificationModel_1.NotificationKey.EmailConfirmed);
            expect(n.message).toBe('testing');
            expect(n.level).toBe(types_1.NotificationLevel.Important);
        });
    });
    test('should create only one notification per key', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const model = (0, testUtils_1.models)().notification();
            yield model.add(user.id, NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Important, 'testing');
            yield model.add(user.id, NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Important, 'testing');
            expect((yield model.all()).length).toBe(1);
        });
    });
    test('should mark a notification as read', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const model = (0, testUtils_1.models)().notification();
            yield model.add(user.id, NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Important, 'testing');
            expect((yield model.loadByKey(user.id, NotificationModel_1.NotificationKey.EmailConfirmed)).read).toBe(0);
            yield model.setRead(user.id, NotificationModel_1.NotificationKey.EmailConfirmed);
            expect((yield model.loadByKey(user.id, NotificationModel_1.NotificationKey.EmailConfirmed)).read).toBe(1);
        });
    });
});
//# sourceMappingURL=NotificationModel.test.js.map