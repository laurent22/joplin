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
const errors_1 = require("../utils/errors");
const types_1 = require("../services/database/types");
const shareApiUtils_1 = require("../utils/testing/shareApiUtils");
describe('ShareModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('ShareModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should validate share objects', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const item = yield (0, testUtils_1.createItem)(session.id, 'root:/test.txt:', 'testing');
            let error = null;
            error = yield (0, testUtils_1.checkThrowAsync)(() => __awaiter(this, void 0, void 0, function* () { return yield (0, testUtils_1.models)().share().createShare(user.id, 20, item.id); }));
            expect(error instanceof errors_1.ErrorBadRequest).toBe(true);
            error = yield (0, testUtils_1.checkThrowAsync)(() => __awaiter(this, void 0, void 0, function* () { return yield (0, testUtils_1.models)().share().createShare(user.id, types_1.ShareType.Note, 'doesntexist'); }));
            expect(error instanceof errors_1.ErrorNotFound).toBe(true);
        });
    });
    test('should get all shares of a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3, session: session3 } = yield (0, testUtils_1.createUserAndSession)(3);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            yield (0, testUtils_1.createItemTree)(user2.id, '', {
                '000000000000000000000000000000F2': {
                    '00000000000000000000000000000002': null,
                },
            });
            const folderItem1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            yield (0, shareApiUtils_1.shareWithUserAndAccept)(session1.id, session3.id, user3, types_1.ShareType.Folder, folderItem1);
            const folderItem2 = yield (0, testUtils_1.models)().item().loadByJopId(user2.id, '000000000000000000000000000000F2');
            yield (0, shareApiUtils_1.shareWithUserAndAccept)(session2.id, session1.id, user1, types_1.ShareType.Folder, folderItem2);
            const shares1 = yield (0, testUtils_1.models)().share().byUserId(user1.id, types_1.ShareType.Folder);
            const shares2 = yield (0, testUtils_1.models)().share().byUserId(user2.id, types_1.ShareType.Folder);
            const shares3 = yield (0, testUtils_1.models)().share().byUserId(user3.id, types_1.ShareType.Folder);
            expect(shares1.length).toBe(2);
            expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();
            expect(shares1.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();
            expect(shares2.length).toBe(1);
            expect(shares2.find(s => s.folder_id === '000000000000000000000000000000F2')).toBeTruthy();
            expect(shares3.length).toBe(1);
            expect(shares3.find(s => s.folder_id === '000000000000000000000000000000F1')).toBeTruthy();
            const participatedShares1 = yield (0, testUtils_1.models)().share().participatedSharesByUser(user1.id, types_1.ShareType.Folder);
            const participatedShares2 = yield (0, testUtils_1.models)().share().participatedSharesByUser(user2.id, types_1.ShareType.Folder);
            const participatedShares3 = yield (0, testUtils_1.models)().share().participatedSharesByUser(user3.id, types_1.ShareType.Folder);
            expect(participatedShares1.length).toBe(1);
            expect(participatedShares1[0].owner_id).toBe(user2.id);
            expect(participatedShares1[0].folder_id).toBe('000000000000000000000000000000F2');
            expect(participatedShares2.length).toBe(0);
            expect(participatedShares3.length).toBe(1);
            expect(participatedShares3[0].owner_id).toBe(user1.id);
            expect(participatedShares3[0].folder_id).toBe('000000000000000000000000000000F1');
        });
    });
    test('should generate only one link per shared note', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            const share1 = yield (0, testUtils_1.models)().share().shareNote(user1, '00000000000000000000000000000001', '', false);
            const share2 = yield (0, testUtils_1.models)().share().shareNote(user1, '00000000000000000000000000000001', '', false);
            expect(share1.id).toBe(share2.id);
        });
    });
    test('should delete a note that has been shared', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            yield (0, testUtils_1.models)().share().shareNote(user1, '00000000000000000000000000000001', '', false);
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            yield (0, testUtils_1.models)().item().delete(noteItem.id);
            expect(yield (0, testUtils_1.models)().item().load(noteItem.id)).toBeFalsy();
        });
    });
    test('should count number of items in share', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            expect(yield (0, testUtils_1.models)().share().itemCountByShareId(share.id)).toBe(2);
            yield (0, testUtils_1.models)().item().delete((yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001')).id);
            yield (0, testUtils_1.models)().item().delete((yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1')).id);
            expect(yield (0, testUtils_1.models)().share().itemCountByShareId(share.id)).toBe(0);
        });
    });
    test('should count number of items in share per recipient', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3 } = yield (0, testUtils_1.createUserAndSession)(3);
            yield (0, testUtils_1.createUserAndSession)(4); // To check that he's not included in the results since the items are not shared with him
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            yield (0, shareApiUtils_1.inviteUserToShare)(share, session1.id, user3.email);
            const rows = yield (0, testUtils_1.models)().share().itemCountByShareIdPerUser(share.id);
            expect(rows.length).toBe(3);
            expect(rows.find(r => r.user_id === user1.id).item_count).toBe(2);
            expect(rows.find(r => r.user_id === user2.id).item_count).toBe(2);
            expect(rows.find(r => r.user_id === user3.id).item_count).toBe(2);
        });
    });
    test('should create user items for shared folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3 } = yield (0, testUtils_1.createUserAndSession)(3);
            yield (0, testUtils_1.createUserAndSession)(4); // To check that he's not included in the results since the items are not shared with him
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            // When running that function with a new user, it should get all the
            // share items
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user3.id)).length).toBe(0);
            yield (0, testUtils_1.models)().share().createSharedFolderUserItems(share.id, user3.id);
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user3.id)).length).toBe(2);
            // Calling the function again should not throw - it should just ignore
            // the items that have already been added.
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.models)().share().createSharedFolderUserItems(share.id, user3.id); }));
            // After adding a new note to the share, and calling the function, it
            // should add the note to the other user collection.
            expect(yield (0, testUtils_1.models)().share().itemCountByShareId(share.id)).toBe(2);
            yield (0, testUtils_1.createNote)(session1.id, {
                id: '00000000000000000000000000000003',
                share_id: share.id,
            });
            expect(yield (0, testUtils_1.models)().share().itemCountByShareId(share.id)).toBe(3);
            yield (0, testUtils_1.models)().share().createSharedFolderUserItems(share.id, user3.id);
            expect(yield (0, testUtils_1.models)().share().itemCountByShareId(share.id)).toBe(3);
        });
    });
});
//# sourceMappingURL=ShareModel.test.js.map