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
const config_1 = require("../config");
const shareApiUtils_1 = require("../utils/testing/shareApiUtils");
const testUtils_1 = require("../utils/testing/testUtils");
const types_1 = require("../utils/types");
const ShareService_1 = require("./ShareService");
describe('ShareService', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('ShareService');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should run maintenance when an item is changed', function () {
        return __awaiter(this, void 0, void 0, function* () {
            jest.useFakeTimers();
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const service = new ShareService_1.default(types_1.Env.Dev, (0, testUtils_1.models)(), (0, config_1.default)());
            void service.runInBackground();
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F2', {
                '000000000000000000000000000000F1': {},
                '000000000000000000000000000000F2': {
                    '00000000000000000000000000000001': null,
                },
            });
            const folderItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F2');
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            // await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);
            // Modify the note parent, which should trigger a maintenance in x
            // seconds.
            const note = yield (0, testUtils_1.models)().item().loadAsJoplinItem(noteItem.id);
            yield (0, testUtils_1.updateNote)(session1.id, Object.assign(Object.assign({}, note), { parent_id: '000000000000000000000000000000F1', share_id: '' }));
            // Force the maintenance to run now
            jest.runOnlyPendingTimers();
            jest.useRealTimers();
            // We need to wait here for it to finish running before we can check the
            // condition. We need to use real timers for this.
            while (service.maintenanceInProgress) {
                yield (0, testUtils_1.msleep)(10);
            }
            // Since the note has been moved to a different folder, the maintenance
            // task should have updated the shared items and removed note 1 from user
            // 2's children.
            const children = yield (0, testUtils_1.models)().item().children(user2.id);
            expect(children.items.length).toBe(1);
            expect(children.items[0].id).toBe(folderItem.id);
            yield service.destroy();
        });
    });
});
//# sourceMappingURL=ShareService.test.js.map