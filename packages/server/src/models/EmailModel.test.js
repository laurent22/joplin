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
const paymentFailedTemplate_1 = require("../views/emails/paymentFailedTemplate");
describe('EmailModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('EmailModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should not send the same keyed email twice', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = yield (0, testUtils_1.createUserAndSession)();
            const sendEmail = (key) => __awaiter(this, void 0, void 0, function* () {
                yield (0, testUtils_1.models)().email().push(Object.assign(Object.assign({}, (0, paymentFailedTemplate_1.default)()), { recipient_email: user.email, recipient_id: user.id, recipient_name: user.full_name || '', sender_id: types_1.EmailSender.Support, key: key }));
            });
            const beforeCount = (yield (0, testUtils_1.models)().email().all()).length;
            yield sendEmail('payment_failed_1');
            expect((yield (0, testUtils_1.models)().email().all()).length).toBe(beforeCount + 1);
            yield sendEmail('payment_failed_1');
            expect((yield (0, testUtils_1.models)().email().all()).length).toBe(beforeCount + 1);
            yield sendEmail('payment_failed_2');
            expect((yield (0, testUtils_1.models)().email().all()).length).toBe(beforeCount + 2);
        });
    });
});
//# sourceMappingURL=EmailModel.test.js.map