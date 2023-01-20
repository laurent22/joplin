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
const testUtils_1 = require("../../utils/testing/testUtils");
const BaseModel_1 = require("@joplin/lib/BaseModel");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const shareApiUtils_1 = require("../../utils/testing/shareApiUtils");
const joplinUtils_1 = require("../../utils/joplinUtils");
const errors_1 = require("../../utils/errors");
describe('api_items', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('api_items');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should create an item', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const noteId = '00000000000000000000000000000001';
            const folderId = '000000000000000000000000000000F1';
            const noteTitle = 'Title';
            const noteBody = 'Body';
            const filename = `${noteId}.md`;
            let item = yield (0, testUtils_1.createItem)(session.id, `root:/${filename}:`, (0, testUtils_1.makeNoteSerializedBody)({
                id: noteId,
                title: noteTitle,
                body: noteBody,
            }));
            item = yield (0, testUtils_1.models)().item().loadByName(user.id, filename);
            const itemId = item.id;
            expect(!!item.id).toBe(true);
            expect(item.name).toBe(filename);
            expect(item.mime_type).toBe('text/markdown');
            expect(item.jop_id).toBe(noteId);
            expect(item.jop_parent_id).toBe(folderId);
            expect(item.jop_encryption_applied).toBe(0);
            expect(item.jop_type).toBe(BaseModel_1.ModelType.Note);
            expect(!item.content).toBe(true);
            expect(item.content_size).toBeGreaterThan(0);
            expect(item.owner_id).toBe(user.id);
            {
                const item = yield (0, testUtils_1.models)().item().loadAsJoplinItem(itemId);
                expect(item.title).toBe(noteTitle);
                expect(item.body).toBe(noteBody);
            }
        });
    });
    test('should modify an item', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const noteId = '00000000000000000000000000000001';
            const filename = `${noteId}.md`;
            const item = yield (0, testUtils_1.createItem)(session.id, `root:/${filename}:`, (0, testUtils_1.makeNoteSerializedBody)({
                id: noteId,
            }));
            const newParentId = '000000000000000000000000000000F2';
            const tempFilePath = yield (0, testUtils_1.makeTempFileWithContent)((0, testUtils_1.makeNoteSerializedBody)({
                parent_id: newParentId,
                title: 'new title',
            }));
            yield (0, apiUtils_1.putApi)(session.id, `items/root:/${filename}:/content`, null, { filePath: tempFilePath });
            const note = yield (0, testUtils_1.models)().item().loadAsJoplinItem(item.id);
            expect(note.parent_id).toBe(newParentId);
            expect(note.title).toBe('new title');
        });
    });
    test('should delete an item', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const tree = {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            };
            const itemModel = (0, testUtils_1.models)().item();
            yield (0, testUtils_1.createItemTree)(user.id, '', tree);
            yield (0, apiUtils_1.deleteApi)(session.id, 'items/root:/00000000000000000000000000000001.md:');
            expect((yield itemModel.all()).length).toBe(1);
            expect((yield itemModel.all())[0].jop_id).toBe('000000000000000000000000000000F1');
        });
    });
    test('should delete all items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2, true);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            const itemModel2 = (0, testUtils_1.models)().item();
            yield (0, testUtils_1.createItemTree)(user2.id, '', {
                '000000000000000000000000000000F2': {
                    '00000000000000000000000000000002': null,
                },
            });
            yield (0, apiUtils_1.deleteApi)(session1.id, 'items/root');
            const allItems = yield itemModel2.all();
            expect(allItems.length).toBe(2);
            const ids = allItems.map(i => i.jop_id);
            expect(ids.sort()).toEqual(['000000000000000000000000000000F2', '00000000000000000000000000000002'].sort());
        });
    });
    test('should get back the serialized note', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const noteId = '00000000000000000000000000000001';
            const filename = `${noteId}.md`;
            const serializedNote = (0, testUtils_1.makeNoteSerializedBody)({
                id: noteId,
            });
            yield (0, testUtils_1.createItem)(session.id, `root:/${filename}:`, serializedNote);
            const result = yield (0, apiUtils_1.getApi)(session.id, `items/root:/${filename}:/content`);
            expect(result).toBe(serializedNote);
        });
    });
    test('should get back the item metadata', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const noteId = '00000000000000000000000000000001';
            yield (0, testUtils_1.createItem)(session.id, `root:/${noteId}.md:`, (0, testUtils_1.makeNoteSerializedBody)({
                id: noteId,
            }));
            const result = yield (0, apiUtils_1.getApi)(session.id, `items/root:/${noteId}.md:`);
            expect(result.name).toBe(`${noteId}.md`);
        });
    });
    test('should batch upload items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1, false);
            const result = yield (0, apiUtils_1.putApi)(session1.id, 'batch_items', {
                items: [
                    {
                        name: '00000000000000000000000000000001.md',
                        body: (0, testUtils_1.makeNoteSerializedBody)({ id: '00000000000000000000000000000001' }),
                    },
                    {
                        name: '00000000000000000000000000000002.md',
                        body: (0, testUtils_1.makeNoteSerializedBody)({ id: '00000000000000000000000000000002' }),
                    },
                ],
            });
            expect(Object.keys(result.items).length).toBe(2);
            expect(Object.keys(result.items).sort()).toEqual(['00000000000000000000000000000001.md', '00000000000000000000000000000002.md']);
        });
    });
    test('should report errors when batch uploading', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1, false);
            const note1 = (0, testUtils_1.makeNoteSerializedBody)({ id: '00000000000000000000000000000001' });
            yield (0, testUtils_1.models)().user().save({ id: user1.id, max_item_size: note1.length });
            const result = yield (0, apiUtils_1.putApi)(session1.id, 'batch_items', {
                items: [
                    {
                        name: '00000000000000000000000000000001.md',
                        body: note1,
                    },
                    {
                        name: '00000000000000000000000000000002.md',
                        body: (0, testUtils_1.makeNoteSerializedBody)({ id: '00000000000000000000000000000002', body: 'too large' }),
                    },
                ],
            });
            const items = result.items;
            expect(Object.keys(items).length).toBe(2);
            expect(Object.keys(items).sort()).toEqual(['00000000000000000000000000000001.md', '00000000000000000000000000000002.md']);
            expect(items['00000000000000000000000000000001.md'].item).toBeTruthy();
            expect(items['00000000000000000000000000000001.md'].error).toBeFalsy();
            expect(items['00000000000000000000000000000002.md'].item).toBeFalsy();
            expect(items['00000000000000000000000000000002.md'].error.httpCode).toBe(errors_1.ErrorPayloadTooLarge.httpCode);
        });
    });
    test('should list children', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)(1, true);
            const itemNames = [
                '.resource/r1',
                'locks/1.json',
                'locks/2.json',
            ];
            for (const itemName of itemNames) {
                yield (0, testUtils_1.createItem)(session.id, `root:/${itemName}:`, `Content for :${itemName}`);
            }
            const noteIds = [];
            for (let i = 1; i <= 3; i++) {
                const noteId = `0000000000000000000000000000000${i}`;
                noteIds.push(noteId);
                yield (0, testUtils_1.createItem)(session.id, `root:/${noteId}.md:`, (0, testUtils_1.makeNoteSerializedBody)({
                    id: noteId,
                }));
            }
            // Get all children
            {
                const result1 = yield (0, apiUtils_1.getApi)(session.id, 'items/root:/:/children', { query: { limit: 4 } });
                expect(result1.items.length).toBe(4);
                expect(result1.has_more).toBe(true);
                const result2 = yield (0, apiUtils_1.getApi)(session.id, 'items/root:/:/children', { query: { cursor: result1.cursor } });
                expect(result2.items.length).toBe(2);
                expect(result2.has_more).toBe(false);
                const items = result1.items.concat(result2.items);
                for (const itemName of itemNames) {
                    expect(!!items.find(it => it.name === itemName)).toBe(true);
                }
                for (const noteId of noteIds) {
                    expect(!!items.find(it => it.name === `${noteId}.md`)).toBe(true);
                }
            }
            // Get sub-children
            {
                const result = yield (0, apiUtils_1.getApi)(session.id, 'items/root:/locks/*:/children');
                expect(result.items.length).toBe(2);
                expect(!!result.items.find(it => it.name === 'locks/1.json')).toBe(true);
                expect(!!result.items.find(it => it.name === 'locks/2.json')).toBe(true);
            }
        });
    });
    test('should associate a resource blob with a share', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [],
                },
            ]);
            yield (0, apiUtils_1.putApi)(session1.id, 'items/root:/.resource/000000000000000000000000000000E1:/content', {}, { query: { share_id: share.id } });
            const item = yield (0, testUtils_1.models)().item().loadByName(user1.id, (0, joplinUtils_1.resourceBlobPath)('000000000000000000000000000000E1'));
            expect(item.jop_share_id).toBe(share.id);
        });
    });
    test('should not upload or download items if the account is disabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session, user } = yield (0, testUtils_1.createUserAndSession)(1);
            // Should work
            yield (0, testUtils_1.createItem)(session.id, 'root:/test1.txt:', 'test1');
            expect(yield (0, testUtils_1.getItem)(session.id, 'root:/test1.txt:')).toBe('test1');
            // Should no longer work
            yield (0, testUtils_1.models)().user().save({ id: user.id, enabled: 0 });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.createItem)(session.id, 'root:/test2.txt:', 'test2'); }), errors_1.ErrorForbidden.httpCode);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, testUtils_1.getItem)(session.id, 'root:/test1.txt:'); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - only share participants can associate an item with a share', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { session: session3 } = yield (0, testUtils_1.createUserAndSession)(3);
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [],
                },
            ]);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return (0, apiUtils_1.putApi)(session3.id, 'items/root:/.resource/000000000000000000000000000000E1:/content', {}, { query: { share_id: share.id } }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should check permissions - uploaded item should be below the allowed limit', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_item_size: 4 });
                yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000001',
                        body: '12345',
                    });
                }), errors_1.ErrorPayloadTooLarge.httpCode);
            }
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_item_size: 1000 });
                yield (0, testUtils_1.expectNoHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000002',
                        body: '12345',
                    });
                }));
            }
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_item_size: 0 });
                yield (0, testUtils_1.expectNoHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000003',
                        body: '12345',
                    });
                }));
            }
        });
    });
    test('should check permissions - uploaded item should not make the account go over the allowed max limit', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_total_item_size: 4 });
                yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000001',
                        body: '12345',
                    });
                }), errors_1.ErrorPayloadTooLarge.httpCode);
            }
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_total_item_size: 1000 });
                yield (0, testUtils_1.expectNoHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000002',
                        body: '12345',
                    });
                }));
            }
            {
                yield (0, testUtils_1.models)().user().save({ id: user1.id, max_total_item_size: 0 });
                yield (0, testUtils_1.expectNoHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                    return (0, testUtils_1.createNote)(session1.id, {
                        id: '00000000000000000000000000000003',
                        body: '12345',
                    });
                }));
            }
        });
    });
    test('should check permissions - should not allow uploading items if disabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.models)().user().save({ id: user1.id, can_upload: 0 });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () {
                return (0, testUtils_1.createNote)(session1.id, {
                    id: '00000000000000000000000000000001',
                    body: '12345',
                });
            }), errors_1.ErrorForbidden.httpCode);
        });
    });
});
//# sourceMappingURL=items.test.js.map