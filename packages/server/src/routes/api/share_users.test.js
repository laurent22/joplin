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
const testUtils_1 = require("../../utils/testing/testUtils");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const shareApiUtils_1 = require("../../utils/testing/shareApiUtils");
const errors_1 = require("../../utils/errors");
describe('share_users', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('share_users');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should list user invitations', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {},
                '000000000000000000000000000000F2': {},
            });
            const folderItem1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const folderItem2 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F2');
            const { share: share1 } = yield (0, shareApiUtils_1.shareWithUserAndAccept)(session1.id, session2.id, user2, types_1.ShareType.Folder, folderItem1);
            const { share: share2 } = yield (0, shareApiUtils_1.shareWithUserAndAccept)(session1.id, session2.id, user2, types_1.ShareType.Folder, folderItem2);
            const shareUsers = yield (0, apiUtils_1.getApi)(session2.id, 'share_users');
            expect(shareUsers.items.length).toBe(2);
            expect(shareUsers.items.find(su => su.share.id === share1.id)).toBeTruthy();
            expect(shareUsers.items.find(su => su.share.id === share2.id)).toBeTruthy();
        });
    });
    test('should not change someone else shareUser object', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createItemTree)(user1.id, '', { '000000000000000000000000000000F1': {} });
            const folderItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const { shareUser } = yield (0, shareApiUtils_1.shareWithUserAndAccept)(session1.id, session2.id, user2, types_1.ShareType.Folder, folderItem);
            // User can modify own UserShare object
            yield (0, apiUtils_1.patchApi)(session2.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Rejected });
            // User cannot modify someone else UserShare object
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.patchApi)(session1.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Accepted }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should not allow accepting a share twice or more', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { shareUser } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.patchApi)(session2.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Accepted }); }), errors_1.ErrorBadRequest.httpCode);
        });
    });
});
//# sourceMappingURL=share_users.test.js.map