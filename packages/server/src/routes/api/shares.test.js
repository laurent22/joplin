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
describe('shares', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('shares');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should retrieve share info', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3 } = yield (0, testUtils_1.createUserAndSession)(3);
            const tree = {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
                '000000000000000000000000000000F2': {
                    '00000000000000000000000000000002': null,
                },
            };
            const itemModel1 = (0, testUtils_1.models)().item();
            yield (0, testUtils_1.createItemTree)(user1.id, '', tree);
            const folderItem = yield itemModel1.loadByJopId(user1.id, '000000000000000000000000000000F1');
            const noteItem2 = yield itemModel1.loadByJopId(user1.id, '00000000000000000000000000000002');
            const { share } = yield (0, shareApiUtils_1.shareWithUserAndAccept)(session1.id, session2.id, user2, types_1.ShareType.Folder, folderItem);
            // Only share with user 3, without accepting it
            yield (0, apiUtils_1.postApi)(session1.id, `shares/${share.id}/users`, {
                email: user3.email,
            });
            yield (0, apiUtils_1.postApi)(session1.id, 'shares', {
                note_id: noteItem2.jop_id,
            });
            {
                const shares = yield (0, apiUtils_1.getApi)(session1.id, 'shares');
                expect(shares.items.length).toBe(2);
                const share1 = shares.items.find(it => it.folder_id === '000000000000000000000000000000F1');
                expect(share1).toBeTruthy();
                expect(share1.type).toBe(types_1.ShareType.Folder);
                const share2 = shares.items.find(it => it.note_id === '00000000000000000000000000000002');
                expect(share2).toBeTruthy();
                expect(share2.type).toBe(types_1.ShareType.Note);
                const shareUsers = yield (0, apiUtils_1.getApi)(session1.id, `shares/${share1.id}/users`);
                expect(shareUsers.items.length).toBe(2);
                const su2 = shareUsers.items.find(su => su.user.email === 'user2@localhost');
                expect(su2).toBeTruthy();
                expect(su2.status).toBe(types_1.ShareUserStatus.Accepted);
                const su3 = shareUsers.items.find(su => su.user.email === 'user3@localhost');
                expect(su3).toBeTruthy();
                expect(su3.status).toBe(types_1.ShareUserStatus.Waiting);
            }
        });
    });
});
//# sourceMappingURL=shares.test.js.map