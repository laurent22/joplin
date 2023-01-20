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
const time_1 = require("../../utils/time");
const errors_1 = require("../../utils/errors");
const joplinUtils_1 = require("../../utils/joplinUtils");
describe('shares.folder', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('shares.folder');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should share a folder with another user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const folderItem = yield (0, testUtils_1.createFolder)(session1.id, { title: 'created by sharer' });
            // ----------------------------------------------------------------
            // Create the file share object
            // ----------------------------------------------------------------
            const share = yield (0, apiUtils_1.postApi)(session1.id, 'shares', {
                type: types_1.ShareType.Folder,
                folder_id: folderItem.jop_id,
            });
            // ----------------------------------------------------------------
            // Once the share object has been created, the client can add folders
            // and notes to it. This is done by setting the share_id property,
            // which we simulate here.
            // ----------------------------------------------------------------
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                id: folderItem.id,
                jop_share_id: share.id,
            });
            // ----------------------------------------------------------------
            // Send the share to a user
            // ----------------------------------------------------------------
            let shareUser = yield (0, apiUtils_1.postApi)(session1.id, `shares/${share.id}/users`, {
                email: user2.email,
            });
            shareUser = yield (0, testUtils_1.models)().shareUser().load(shareUser.id);
            expect(shareUser.share_id).toBe(share.id);
            expect(shareUser.user_id).toBe(user2.id);
            expect(shareUser.status).toBe(types_1.ShareUserStatus.Waiting);
            // ----------------------------------------------------------------
            // On the sharee side, accept the share
            // ----------------------------------------------------------------
            yield (0, apiUtils_1.patchApi)(session2.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Accepted });
            {
                shareUser = yield (0, testUtils_1.models)().shareUser().load(shareUser.id);
                expect(shareUser.status).toBe(types_1.ShareUserStatus.Accepted);
            }
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            // ----------------------------------------------------------------
            // On the sharee side, check that the file is present
            // and with the right content.
            // ----------------------------------------------------------------
            const results = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/children');
            expect(results.items.length).toBe(1);
            expect(results.items[0].name).toBe(folderItem.name);
            const itemContent = yield (0, apiUtils_1.getApi)(session2.id, `items/root:/${folderItem.name}:/content`);
            expect(itemContent.toString().includes('created by sharer')).toBe(true);
            // ----------------------------------------------------------------
            // If file is changed by sharee, sharer should see the change too
            // ----------------------------------------------------------------
            {
                const folder = yield (0, joplinUtils_1.unserializeJoplinItem)(itemContent.toString());
                folder.title = 'modified by recipient';
                yield (0, testUtils_1.updateItem)(session2.id, `root:/${folderItem.name}:`, yield (0, joplinUtils_1.serializeJoplinItem)(folder));
                // Double check that it didn't create a new item instead of updating it
                expect((yield (0, testUtils_1.models)().item().all()).length).toBe(1);
                const modContent = yield (0, apiUtils_1.getApi)(session1.id, `items/root:/${folderItem.name}:/content`);
                expect(modContent.toString().includes('modified by recipient')).toBe(true);
            }
        });
    });
    test('should share a folder and all its children', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F3', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [],
                },
                {
                    id: '000000000000000000000000000000F2',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
                {
                    id: '000000000000000000000000000000F3',
                    children: [
                        {
                            id: '00000000000000000000000000000003',
                        },
                        {
                            id: '000000000000000000000000000000F4',
                            children: [
                                {
                                    id: '00000000000000000000000000000004',
                                },
                                {
                                    id: '00000000000000000000000000000005',
                                },
                            ],
                        },
                    ],
                },
            ]);
            const children1 = yield (0, apiUtils_1.getApi)(session1.id, 'items/root/children');
            expect(children1.items.length).toBe(8);
            const children2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/children');
            expect(children2.items.length).toBe(5);
            const expectedNames = [
                '000000000000000000000000000000F3.md',
                '00000000000000000000000000000003.md',
                '000000000000000000000000000000F4.md',
                '00000000000000000000000000000004.md',
                '00000000000000000000000000000005.md',
            ];
            expect(children2.items.map(i => i.name).sort().join(',')).toBe(expectedNames.sort().join(','));
        });
    });
    test('should received shared items only once invitation accepted', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { shareUser } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ], false);
            // The invitation has not been accepted yet, so user 2 should not see any item
            {
                const children2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/children');
                expect(children2.items.length).toBe(0);
            }
            yield (0, apiUtils_1.patchApi)(session2.id, `share_users/${shareUser.id}`, { status: types_1.ShareUserStatus.Accepted });
            // As soon as the invitation is accepted, all items should be available,
            // without having to wait for the share service.
            {
                const children2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/children');
                expect(children2.items.length).toBe(2);
            }
        });
    });
    test('should share when a note is added to a shared folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F2', [
                {
                    id: '000000000000000000000000000000F2',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            yield (0, testUtils_1.createNote)(session1.id, {
                id: '00000000000000000000000000000002',
                parent_id: '000000000000000000000000000000F2',
                share_id: share.id,
            });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
            expect(newChildren.items.length).toBe(3);
            expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000002.md')).toBe(true);
        });
    });
    test('should update share status when note parent changes', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { share: share1 } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                        {
                            id: '000000000000000000000000000000F2',
                            children: [],
                        },
                    ],
                },
            ]);
            const { share: share2 } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F5', [
                {
                    id: '000000000000000000000000000000F3',
                    children: [],
                },
                {
                    id: '000000000000000000000000000000F4',
                    children: [],
                },
                {
                    id: '000000000000000000000000000000F5',
                    children: [],
                },
            ]);
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            // Note is moved to another folder, but still within shared folder
            {
                yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                    id: noteItem.id,
                    jop_parent_id: '000000000000000000000000000000F2',
                    jop_share_id: share1.id,
                });
                yield (0, testUtils_1.models)().share().updateSharedItems3();
                const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
                expect(newChildren.items.length).toBe(4);
            }
            // Note is moved to another folder, outside to a non-shared folder
            {
                yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                    id: noteItem.id,
                    jop_parent_id: '000000000000000000000000000000F3',
                    jop_share_id: '',
                });
                yield (0, testUtils_1.models)().share().updateSharedItems3();
                const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
                expect(newChildren.items.length).toBe(3);
                expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
            }
            // Note is moved from a non-shared folder to another non-shared folder
            {
                yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                    id: noteItem.id,
                    jop_parent_id: '000000000000000000000000000000F4',
                    jop_share_id: '',
                });
                yield (0, testUtils_1.models)().share().updateSharedItems3();
                const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
                expect(newChildren.items.length).toBe(3);
                expect(newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(undefined);
            }
            // Note is moved from a non-shared folder, back to a shared folder
            {
                yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                    id: noteItem.id,
                    jop_parent_id: '000000000000000000000000000000F1',
                    jop_share_id: share1.id,
                });
                yield (0, testUtils_1.models)().share().updateSharedItems3();
                const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
                expect(newChildren.items.length).toBe(4);
                expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
            }
            // Note is moved from a shared folder to a different shared folder
            {
                yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                    id: noteItem.id,
                    jop_parent_id: '000000000000000000000000000000F5',
                    jop_share_id: share2.id,
                });
                yield (0, testUtils_1.models)().share().updateSharedItems3();
                const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
                expect(newChildren.items.length).toBe(4);
                expect(!!newChildren.items.find(i => i.name === '00000000000000000000000000000001.md')).toBe(true);
            }
        });
    });
    test('should update share status when note parent changes more than once between updates', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
                '000000000000000000000000000000F2': {},
                '000000000000000000000000000000F3': {},
            });
            const folderItem1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            // Note is moved to a non-shared folder and changed twice, but the
            // parent ID doesn't change.
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                id: noteItem.id,
                jop_parent_id: '000000000000000000000000000000F2',
                jop_share_id: '',
            });
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                id: noteItem.id,
                jop_parent_id: '000000000000000000000000000000F2',
                jop_share_id: '',
            });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            const newChildren = yield (0, testUtils_1.models)().item().children(user2.id);
            expect(newChildren.items.length).toBe(1);
            expect(newChildren.items[0].id).toBe(folderItem1.id);
        });
    });
    test('should unshare a deleted item', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            expect((yield (0, testUtils_1.models)().item().children(user2.id)).items.length).toBe(2);
            const noteModel = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            yield (0, testUtils_1.models)().item().delete(noteModel.id);
            expect((yield (0, testUtils_1.models)().item().children(user2.id)).items.length).toBe(1);
        });
    });
    test('should unshare a deleted shared root folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            const folderItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            yield (0, testUtils_1.models)().item().delete(folderItem.id);
            // await models().share().updateSharedItems3();
            // Once the root folder has been deleted, it is unshared, so the
            // recipient user should no longer see any item
            expect((yield (0, testUtils_1.models)().item().children(user2.id)).items.length).toBe(0);
            // Even though the root folder has been deleted, its children have not
            // been (they are deleted by the client), so the owner should still see
            // one child.
            expect((yield (0, testUtils_1.models)().item().children(user1.id)).items.length).toBe(1);
            // Also check that Share and UserShare objects are deleted
            expect((yield (0, testUtils_1.models)().share().all()).length).toBe(0);
            expect((yield (0, testUtils_1.models)().shareUser().all()).length).toBe(0);
            // Test deleting the share, but not the root folder
        });
    });
    test('should unshare when the share object is deleted', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            expect((yield (0, testUtils_1.models)().item().children(user2.id)).items.length).toBe(2);
            const share = (yield (0, testUtils_1.models)().share().all())[0];
            yield (0, testUtils_1.models)().share().delete(share.id);
            expect((yield (0, testUtils_1.models)().item().children(user1.id)).items.length).toBe(2);
            expect((yield (0, testUtils_1.models)().item().children(user2.id)).items.length).toBe(0);
        });
    });
    // test('should associate a user with the item after sharing', async function() {
    // 	const { session: session1 } = await createUserAndSession(1);
    // 	const { user: user2, session: session2 } = await createUserAndSession(2);
    // 	const item = await createItem(session1.id, 'root:/test.txt:', 'testing');
    // 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);
    // 	expect((await models().userItem().all()).length).toBe(2);
    // 	expect(!!(await models().userItem().all()).find(ui => ui.user_id === user2.id)).toBe(true);
    // });
    // test('should not share an already shared item', async function() {
    // 	const { session: session1 } = await createUserAndSession(1);
    // 	const { user: user2, session: session2 } = await createUserAndSession(2);
    // 	const { user: user3, session: session3 } = await createUserAndSession(3);
    // 	const item = await createItem(session1.id, 'root:/test.txt:', 'testing');
    // 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.App, item);
    // 	const error = await checkThrowAsync(async () => shareWithUserAndAccept(session2.id, session3.id, user3, ShareType.App, item));
    // 	expect(error.httpCode).toBe(ErrorBadRequest.httpCode);
    // });
    test('should see delta changes for linked items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            let cursor1 = null;
            let cursor2 = null;
            {
                const names = ['000000000000000000000000000000F1.md', '00000000000000000000000000000001.md'].sort();
                const page1 = yield (0, apiUtils_1.getApi)(session1.id, 'items/root/delta');
                expect(page1.items.map(i => i.item_name).sort()).toEqual(names);
                cursor1 = page1.cursor;
                const page2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/delta');
                expect(page2.items.map(i => i.item_name).sort()).toEqual(names);
                cursor2 = page2.cursor;
            }
            // --------------------------------------------------------------------
            // If item is changed on sharer side, sharee should see the changes
            // --------------------------------------------------------------------
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            const note = yield (0, testUtils_1.models)().item().loadAsJoplinItem(noteItem.id);
            yield (0, time_1.msleep)(1);
            yield (0, testUtils_1.updateItem)(session1.id, 'root:/00000000000000000000000000000001.md:', (0, testUtils_1.makeNoteSerializedBody)(Object.assign(Object.assign({}, note), { title: 'modified by user 1' })));
            {
                const page1 = yield (0, apiUtils_1.getApi)(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
                expect(page1.items.length).toBe(1);
                expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
                expect(page1.items[0].type).toBe(types_1.ChangeType.Update);
                cursor1 = page1.cursor;
                const page2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
                expect(page2.items.length).toBe(1);
                expect(page2.items[0].item_name).toBe('00000000000000000000000000000001.md');
                expect(page2.items[0].type).toBe(types_1.ChangeType.Update);
                expect(page2.items[0].updated_time).toBe(page1.items[0].updated_time);
                cursor2 = page2.cursor;
            }
            // --------------------------------------------------------------------
            // If item is changed on sharee side, sharer should see the changes
            // --------------------------------------------------------------------
            yield (0, time_1.msleep)(1);
            yield (0, testUtils_1.updateItem)(session2.id, 'root:/00000000000000000000000000000001.md:', (0, testUtils_1.makeNoteSerializedBody)(Object.assign(Object.assign({}, note), { title: 'modified by user 2' })));
            {
                const page1 = yield (0, apiUtils_1.getApi)(session1.id, 'items/root/delta', { query: { cursor: cursor1 } });
                expect(page1.items.length).toBe(1);
                expect(page1.items[0].item_name).toBe('00000000000000000000000000000001.md');
                expect(page1.items[0].type).toBe(types_1.ChangeType.Update);
                cursor1 = page1.cursor;
                const page2 = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/delta', { query: { cursor: cursor2 } });
                expect(page2.items.length).toBe(1);
                expect(page2.items[0].item_name).toBe('00000000000000000000000000000001.md');
                expect(page2.items[0].type).toBe(types_1.ChangeType.Update);
                cursor2 = page2.cursor;
            }
        });
    });
    test('should get delta changes - user 2 sync, user 1 share and sync, user 2 sync', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // - User 1 sync
            // - User 2 sync - and keep delta2
            // - User 1 share a folder with user 2
            // - User 2 accepts
            // - User 2 sync from delta2
            // => Should get shared folder and its content
            // When fetching changes - should add all user_items that have been created since delta2
            // And emit Create event for associated item ID
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createItemTree)(user2.id, '', {
                '200000000000000000000000000000F2': {},
            });
            let latestChanges2 = yield (0, testUtils_1.models)().change().delta(user2.id);
            const cursor2 = latestChanges2.cursor;
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            latestChanges2 = yield (0, testUtils_1.models)().change().delta(user2.id, { cursor: cursor2 });
            expect(latestChanges2.items.length).toBe(2);
        });
    });
    test('should get delta changes - user 1 and 2 are in sync, user 2 adds a note to shared folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            let latestChanges1 = yield (0, testUtils_1.models)().change().delta(user1.id);
            const cursor1 = latestChanges1.cursor;
            const folderItem1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            yield (0, testUtils_1.createNote)(session2.id, {
                id: '00000000000000000000000000000002',
                title: 'from user 2',
                parent_id: folderItem1.jop_id,
                share_id: share.id,
            });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            latestChanges1 = yield (0, testUtils_1.models)().change().delta(user1.id, { cursor: cursor1 });
            expect(latestChanges1.items.length).toBe(1);
            expect(latestChanges1.items[0].item_name).toBe('00000000000000000000000000000002.md');
        });
    });
    test('should get delta changes - user 1 and 2 are in sync, user 2 moves a note out of shared folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            let latestChanges1 = yield (0, testUtils_1.models)().change().delta(user1.id);
            const cursor1 = latestChanges1.cursor;
            const folderItem2 = yield (0, testUtils_1.createFolder)(session2.id, { id: '000000000000000000000000000000F2', title: 'folder2' });
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            const note = yield (0, testUtils_1.models)().item().loadAsJoplinItem(noteItem.id);
            yield (0, testUtils_1.updateNote)(session2.id, Object.assign(Object.assign({}, note), { parent_id: folderItem2.jop_id, share_id: '' }));
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            latestChanges1 = yield (0, testUtils_1.models)().change().delta(user1.id, { cursor: cursor1 });
            expect(latestChanges1.items.length).toBe(1);
            expect(latestChanges1.items[0].type).toBe(types_1.ChangeType.Delete);
            expect(latestChanges1.items[0].item_id).toBe(noteItem.id);
        });
    });
    test('should get delta changes - user 1 and 2 are in sync, user 1 deletes invitation', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const resourceItem1 = yield (0, testUtils_1.createResource)(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
            const { shareUser, share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                            title: 'note test',
                            body: `[testing](:/${resourceItem1.jop_id})`,
                        },
                    ],
                },
            ]);
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                id: resourceItem1.id,
                jop_share_id: share.id,
            });
            const resourceBlob = yield (0, testUtils_1.models)().item().loadByName(user1.id, (0, joplinUtils_1.resourceBlobPath)(resourceItem1.jop_id));
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, {
                id: resourceBlob.id,
                jop_share_id: share.id,
            });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(4);
            yield (0, apiUtils_1.deleteApi)(session1.id, `share_users/${shareUser.id}`);
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(0);
        });
    });
    test('should share an empty folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [],
                },
            ]);
        });
    });
    test('should unshare from a non-owner user who has deleted the root folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { item } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(2);
            yield (0, apiUtils_1.deleteApi)(session2.id, `items/root:/${item.name}:`);
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user1.id)).length).toBe(2);
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(0);
        });
    });
    test('should unshare a folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // The process to unshare a folder is as follow:
            //
            // - Client call DELETE /api/share/:id
            // - Client sets the share_id of the folder and all sub-items to ""
            //
            // After doing this, when running updateSharedItems() on the server, it
            // will process a share that no longer exists. This is expected and
            // should not crash the process.
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { item, share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(2);
            const noteItem = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            // Simulate unsharing by setting the share ID to "" and deleting the share object
            yield (0, apiUtils_1.deleteApi)(session1.id, `shares/${share.id}`);
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, { id: item.id, jop_share_id: '' });
            yield (0, testUtils_1.models)().item().saveForUser(user1.id, { id: noteItem.id, jop_share_id: '' });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            expect((yield (0, testUtils_1.models)().userItem().byUserId(user2.id)).length).toBe(0);
        });
    });
    // test('should handle incomplete sync - orphan note is moved out of shared folder', async function() {
    // 	// - A note and its folder are moved to a shared folder.
    // 	// - However when data is synchronised, only the note is synced (not the folder).
    // 	// - Then later the note is synchronised.
    // 	// In that case, we need to make sure that both folder and note are eventually shared.
    // 	const { session: session1 } = await createUserAndSession(1);
    // 	const { user: user2, session: session2 } = await createUserAndSession(2);
    // 	const folderItem1 = await createFolder(session1.id, { id: '000000000000000000000000000000F1' });
    // 	const noteItem1 = await createNote(session1.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F2' });
    // 	await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem1);
    // 	// await models().share().updateSharedItems2();
    // 	await createFolder(session1.id, { id: '000000000000000000000000000000F2', parent_id: folderItem1.jop_id });
    // 	await models().share().updateSharedItems2(user2.id);
    // 	const children = await models().item().children(user2.id);
    // 	expect(children.items.length).toBe(3);
    // 	expect(children.items.find(c => c.id === noteItem1.id)).toBeTruthy();
    // });
    test('should check permissions - cannot share a folder with yourself', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree)(user1.id, '', { '000000000000000000000000000000F1': {} });
            const share = yield (0, apiUtils_1.postApi)(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.postApi)(session1.id, `shares/${share.id}/users`, { email: user1.email }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - cannot share a folder twice with a user', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.createItemTree)(user1.id, '', { '000000000000000000000000000000F1': {} });
            const share = yield (0, apiUtils_1.postApi)(session1.id, 'shares', { folder_id: '000000000000000000000000000000F1' });
            yield (0, apiUtils_1.postApi)(session1.id, `shares/${share.id}/users`, { email: user2.email });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.postApi)(session1.id, `shares/${share.id}/users`, { email: user2.email }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - cannot share a non-root folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '000000000000000000000000000000F2': {},
                },
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.postApi)(session1.id, 'shares', { folder_id: '000000000000000000000000000000F2' }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - cannot share if share feature not enabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.models)().user().save({ id: user1.id, can_share_folder: 0 });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                return (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                    {
                        id: '000000000000000000000000000000F1',
                        children: [],
                    },
                ]);
            }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - cannot share if share feature not enabled for recipient', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.models)().user().save({ id: user2.id, can_share_folder: 0 });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                return (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                    {
                        id: '000000000000000000000000000000F1',
                        children: [],
                    },
                ]);
            }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - by default sharing by note is always possible', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const noteItem = yield (0, testUtils_1.createNote)(session1.id, {
                title: 'Testing title',
                body: 'Testing body',
            });
            const share = yield (0, apiUtils_1.postApi)(session1.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: noteItem.jop_id,
            });
            expect(share).toBeTruthy();
        });
    });
    test('should check permissions - cannot share with a disabled account', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            yield (0, testUtils_1.models)().user().save({
                id: user2.id,
                enabled: 0,
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                return (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                    {
                        id: '000000000000000000000000000000F1',
                        children: [],
                    },
                ]);
            }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should allow sharing, unsharing and sharing again', function () {
        return __awaiter(this, void 0, void 0, function* () {
            // - U1 share a folder that contains a note
            // - U2 accept
            // - U2 syncs
            // - U1 remove U2
            // - U1 adds back U2
            // - U2 accept
            //
            // => Previously, the notebook would be deleted fro U2 due to a quirk in
            // delta sync, that doesn't handle user_items being deleted, then
            // created again. Instead U2 should end up with both the folder and the
            // note.
            //
            // Ref: https://discourse.joplinapp.org/t/20977
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { shareUser: shareUserA, share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            yield (0, apiUtils_1.deleteApi)(session1.id, `share_users/${shareUserA.id}`);
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            yield (0, shareApiUtils_1.inviteUserToShare)(share, session1.id, user2.email, true);
            yield (0, testUtils_1.models)().share().updateSharedItems3();
            const page = yield (0, apiUtils_1.getApi)(session2.id, 'items/root/delta', { query: { cursor: '' } });
            expect(page.items.length).toBe(2);
            expect(page.items.find(it => it.item_name === '000000000000000000000000000000F1.md').type).toBe(types_1.ChangeType.Create);
            expect(page.items.find(it => it.item_name === '00000000000000000000000000000001.md').type).toBe(types_1.ChangeType.Create);
        });
    });
});
//# sourceMappingURL=shares.folder.test.js.map