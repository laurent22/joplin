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
const types_1 = require("../../services/database/types");
const routeHandler_1 = require("../../middleware/routeHandler");
const NotificationModel_1 = require("../../models/NotificationModel");
const testUtils_1 = require("../../utils/testing/testUtils");
describe('index_notification', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('index_notification');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should update notification', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)();
            const model = (0, testUtils_1.models)().notification();
            yield model.add(user.id, NotificationModel_1.NotificationKey.EmailConfirmed, types_1.NotificationLevel.Normal, 'testing notification');
            const notification = yield model.loadByKey(user.id, NotificationModel_1.NotificationKey.EmailConfirmed);
            expect(notification.read).toBe(0);
            const context = yield (0, testUtils_1.koaAppContext)({
                sessionId: session.id,
                request: {
                    method: 'PATCH',
                    url: `/notifications/${notification.id}`,
                    body: {
                        read: 1,
                    },
                },
            });
            yield (0, routeHandler_1.default)(context);
            expect((yield model.loadByKey(user.id, NotificationModel_1.NotificationKey.EmailConfirmed)).read).toBe(1);
        });
    });
});
//# sourceMappingURL=notifications.test.js.map