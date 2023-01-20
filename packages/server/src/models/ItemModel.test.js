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
const shareApiUtils_1 = require("../utils/testing/shareApiUtils");
const joplinUtils_1 = require("../utils/joplinUtils");
const factory_1 = require("./factory");
const types_1 = require("../utils/types");
const config_1 = require("../config");
const time_1 = require("../utils/time");
const loadStorageDriver_1 = require("./items/storage/loadStorageDriver");
const errors_1 = require("../utils/errors");
const db_1 = require("../db");
describe('ItemModel', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('ItemModel');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    // test('should find exclusively owned items 1', async function() {
    // 	const { user: user1 } = await createUserAndSession(1, true);
    // 	const { session: session2, user: user2 } = await createUserAndSession(2);
    // 	const tree: any = {
    // 		'000000000000000000000000000000F1': {
    // 			'00000000000000000000000000000001': null,
    // 		},
    // 	};
    // 	await createItemTree(user1.id, '', tree);
    // 	await createItem(session2.id, 'root:/test.txt:', 'testing');
    // 	{
    // 		const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
    // 		expect(itemIds.length).toBe(2);
    // 		const item1 = await models().item().load(itemIds[0]);
    // 		const item2 = await models().item().load(itemIds[1]);
    // 		expect([item1.jop_id, item2.jop_id].sort()).toEqual(['000000000000000000000000000000F1', '00000000000000000000000000000001'].sort());
    // 	}
    // 	{
    // 		const itemIds = await models().item().exclusivelyOwnedItemIds(user2.id);
    // 		expect(itemIds.length).toBe(1);
    // 	}
    // });
    // test('should find exclusively owned items 2', async function() {
    // 	const { session: session1, user: user1 } = await createUserAndSession(1, true);
    // 	const { session: session2, user: user2 } = await createUserAndSession(2);
    // 	await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
    // 		'000000000000000000000000000000F1': {
    // 			'00000000000000000000000000000001': null,
    // 		},
    // 	});
    // 	await createFolder(session2.id, { id: '000000000000000000000000000000F2' });
    // 	{
    // 		const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
    // 		expect(itemIds.length).toBe(0);
    // 	}
    // 	{
    // 		const itemIds = await models().item().exclusivelyOwnedItemIds(user2.id);
    // 		expect(itemIds.length).toBe(1);
    // 	}
    // 	await models().user().delete(user2.id);
    // 	{
    // 		const itemIds = await models().item().exclusivelyOwnedItemIds(user1.id);
    // 		expect(itemIds.length).toBe(2);
    // 	}
    // });
    test('should find all items within a shared folder', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const resourceItem1 = yield (0, testUtils_1.createResource)(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
            const resourceItem2 = yield (0, testUtils_1.createResource)(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');
            const { share } = yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                            title: 'note test 1',
                            body: `[testing 1](:/${resourceItem1.jop_id}) [testing 2](:/${resourceItem2.jop_id})`,
                        },
                        {
                            id: '00000000000000000000000000000002',
                            title: 'note test 2',
                            body: '',
                        },
                    ],
                },
                {
                    id: '000000000000000000000000000000F2',
                    children: [],
                },
            ]);
            yield (0, testUtils_1.createNote)(session2.id, { id: '00000000000000000000000000000003', parent_id: '000000000000000000000000000000F1' });
            {
                const shareUserIds = yield (0, testUtils_1.models)().share().allShareUserIds(share);
                const children = yield (0, testUtils_1.models)().item().sharedFolderChildrenItems(shareUserIds, '000000000000000000000000000000F1');
                expect(children.filter(c => !!c.jop_id).map(c => c.jop_id).sort()).toEqual([
                    '00000000000000000000000000000001',
                    '00000000000000000000000000000002',
                    '00000000000000000000000000000003',
                    '000000000000000000000000000000E1',
                    '000000000000000000000000000000E2',
                ].sort());
                expect(children.filter(c => !c.jop_id).map(c => c.name).sort()).toEqual([
                    (0, joplinUtils_1.resourceBlobPath)('000000000000000000000000000000E1'),
                    (0, joplinUtils_1.resourceBlobPath)('000000000000000000000000000000E2'),
                ].sort());
            }
            {
                const children = yield (0, testUtils_1.models)().item().sharedFolderChildrenItems([user1.id], '000000000000000000000000000000F2');
                expect(children.map(c => c.jop_id).sort()).toEqual([].sort());
            }
        });
    });
    test('should count items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1, true);
            yield (0, testUtils_1.createItemTree)(user1.id, '', {
                '000000000000000000000000000000F1': {
                    '00000000000000000000000000000001': null,
                },
            });
            expect(yield (0, testUtils_1.models)().item().childrenCount(user1.id)).toBe(2);
        });
    });
    test('should calculate the total size', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3 } = yield (0, testUtils_1.createUserAndSession)(3);
            yield (0, testUtils_1.createItemTree3)(user1.id, '', '', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            yield (0, testUtils_1.createItemTree3)(user2.id, '', '', [
                {
                    id: '000000000000000000000000000000F2',
                    children: [
                        {
                            id: '00000000000000000000000000000002',
                        },
                        {
                            id: '00000000000000000000000000000003',
                        },
                    ],
                },
            ]);
            const folder1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const folder2 = yield (0, testUtils_1.models)().item().loadByJopId(user2.id, '000000000000000000000000000000F2');
            const note1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            const note2 = yield (0, testUtils_1.models)().item().loadByJopId(user2.id, '00000000000000000000000000000002');
            const note3 = yield (0, testUtils_1.models)().item().loadByJopId(user2.id, '00000000000000000000000000000003');
            const totalSize1 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user1.id);
            const totalSize2 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user2.id);
            const totalSize3 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user3.id);
            const expected1 = folder1.content_size + note1.content_size;
            const expected2 = folder2.content_size + note2.content_size + note3.content_size;
            const expected3 = 0;
            expect(totalSize1).toBe(expected1);
            expect(totalSize2).toBe(expected2);
            expect(totalSize3).toBe(expected3);
            yield (0, testUtils_1.models)().item().updateTotalSizes();
            expect((yield (0, testUtils_1.models)().user().load(user1.id)).total_item_size).toBe(totalSize1);
            expect((yield (0, testUtils_1.models)().user().load(user2.id)).total_item_size).toBe(totalSize2);
            expect((yield (0, testUtils_1.models)().user().load(user3.id)).total_item_size).toBe(totalSize3);
        });
    });
    test('should update total size when an item is deleted', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree3)(user1.id, '', '', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
            ]);
            const folder1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const note1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            yield (0, testUtils_1.models)().item().updateTotalSizes();
            expect((yield (0, testUtils_1.models)().user().load(user1.id)).total_item_size).toBe(folder1.content_size + note1.content_size);
            yield (0, testUtils_1.models)().item().delete(note1.id);
            yield (0, testUtils_1.models)().item().updateTotalSizes();
            expect((yield (0, testUtils_1.models)().user().load(user1.id)).total_item_size).toBe(folder1.content_size);
        });
    });
    test('should include shared items in total size calculation', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1, session: session1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { user: user2, session: session2 } = yield (0, testUtils_1.createUserAndSession)(2);
            const { user: user3 } = yield (0, testUtils_1.createUserAndSession)(3);
            yield (0, shareApiUtils_1.shareFolderWithUser)(session1.id, session2.id, '000000000000000000000000000000F1', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        {
                            id: '00000000000000000000000000000001',
                        },
                    ],
                },
                {
                    id: '000000000000000000000000000000F2',
                },
            ]);
            const folder1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
            const folder2 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '000000000000000000000000000000F2');
            const note1 = yield (0, testUtils_1.models)().item().loadByJopId(user1.id, '00000000000000000000000000000001');
            const totalSize1 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user1.id);
            const totalSize2 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user2.id);
            const totalSize3 = yield (0, testUtils_1.models)().item().calculateUserTotalSize(user3.id);
            const expected1 = folder1.content_size + folder2.content_size + note1.content_size;
            const expected2 = folder1.content_size + note1.content_size;
            const expected3 = 0;
            expect(totalSize1).toBe(expected1);
            expect(totalSize2).toBe(expected2);
            expect(totalSize3).toBe(expected3);
            yield (0, testUtils_1.models)().item().updateTotalSizes();
            expect((yield (0, testUtils_1.models)().user().load(user1.id)).total_item_size).toBe(expected1);
            expect((yield (0, testUtils_1.models)().user().load(user2.id)).total_item_size).toBe(expected2);
            expect((yield (0, testUtils_1.models)().user().load(user3.id)).total_item_size).toBe(expected3);
        });
    });
    test('should respect the hard item size limit', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            let models = (0, factory_1.default)((0, testUtils_1.db)(), (0, config_1.default)());
            let result = yield models.item().saveFromRawContent(user1, {
                body: Buffer.from('1234'),
                name: 'test1.txt',
            });
            const item = result['test1.txt'].item;
            (0, config_1.default)().itemSizeHardLimit = 3;
            models = (0, factory_1.default)((0, testUtils_1.db)(), (0, config_1.default)());
            result = yield models.item().saveFromRawContent(user1, {
                body: Buffer.from('1234'),
                name: 'test2.txt',
            });
            expect(result['test2.txt'].error.httpCode).toBe(errors_1.ErrorPayloadTooLarge.httpCode);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return models.item().loadWithContent(item.id); }), errors_1.ErrorPayloadTooLarge.httpCode);
            (0, config_1.default)().itemSizeHardLimit = 1000;
            models = (0, factory_1.default)((0, testUtils_1.db)(), (0, config_1.default)());
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return models.item().loadWithContent(item.id); }));
        });
    });
    const setupImportContentTest = () => __awaiter(this, void 0, void 0, function* () {
        const tempDir1 = yield (0, testUtils_1.tempDir)('storage1');
        const tempDir2 = yield (0, testUtils_1.tempDir)('storage2');
        const fromStorageConfig = {
            type: types_1.StorageDriverType.Filesystem,
            path: tempDir1,
        };
        const toStorageConfig = {
            type: types_1.StorageDriverType.Filesystem,
            path: tempDir2,
        };
        const fromModels = (0, factory_1.default)((0, testUtils_1.db)(), Object.assign(Object.assign({}, (0, config_1.default)()), { storageDriver: fromStorageConfig }));
        const toModels = (0, factory_1.default)((0, testUtils_1.db)(), Object.assign(Object.assign({}, (0, config_1.default)()), { storageDriver: toStorageConfig }));
        const fromDriver = yield (0, loadStorageDriver_1.default)(fromStorageConfig, (0, testUtils_1.db)());
        const toDriver = yield (0, loadStorageDriver_1.default)(toStorageConfig, (0, testUtils_1.db)());
        return {
            fromStorageConfig,
            toStorageConfig,
            fromModels,
            toModels,
            fromDriver,
            toDriver,
        };
    });
    test('should allow importing content to item storage', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { toStorageConfig, fromModels, fromDriver, toDriver, } = yield setupImportContentTest();
            yield fromModels.item().saveFromRawContent(user1, {
                body: Buffer.from(JSON.stringify({ 'version': 1 })),
                name: 'info.json',
            });
            const itemBefore = (yield fromModels.item().all())[0];
            const fromContent = yield fromDriver.read(itemBefore.id, { models: fromModels });
            expect(fromContent.toString()).toBe('{"version":1}');
            expect(itemBefore.content_storage_id).toBe(1);
            yield (0, time_1.msleep)(2);
            const toModels = (0, factory_1.default)((0, testUtils_1.db)(), Object.assign(Object.assign({}, (0, config_1.default)()), { storageDriver: toStorageConfig }));
            const result = yield toModels.item().saveFromRawContent(user1, {
                body: Buffer.from(JSON.stringify({ 'version': 2 })),
                name: 'info2.json',
            });
            const itemBefore2 = result['info2.json'].item;
            yield fromModels.item().importContentToStorage(toStorageConfig);
            const itemAfter = (yield fromModels.item().all()).find(it => it.id === itemBefore.id);
            expect(itemAfter.content_storage_id).toBe(2);
            expect(itemAfter.updated_time).toBe(itemBefore.updated_time);
            // Just check the second item has not been processed since it was
            // already on the right storage
            const itemAfter2 = (yield fromModels.item().all()).find(it => it.id === itemBefore2.id);
            expect(itemAfter2.content_storage_id).toBe(2);
            expect(itemAfter2.updated_time).toBe(itemBefore2.updated_time);
            const toContent = yield toDriver.read(itemAfter.id, { models: fromModels });
            expect(toContent.toString()).toBe(fromContent.toString());
        });
    });
    test('should skip large items when importing content to item storage', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            const { toStorageConfig, fromModels, fromDriver, toDriver, } = yield setupImportContentTest();
            const result = yield fromModels.item().saveFromRawContent(user1, {
                body: Buffer.from(JSON.stringify({ 'version': 1 })),
                name: 'info.json',
            });
            const itemId = result['info.json'].item.id;
            expect(yield fromDriver.exists(itemId, { models: fromModels })).toBe(true);
            yield fromModels.item().importContentToStorage(toStorageConfig, {
                maxContentSize: 1,
            });
            expect(yield toDriver.exists(itemId, { models: fromModels })).toBe(false);
            yield fromModels.item().importContentToStorage(toStorageConfig, {
                maxContentSize: 999999,
            });
            expect(yield toDriver.exists(itemId, { models: fromModels })).toBe(true);
        });
    });
    test('should delete the database item content', function () {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, db_1.isSqlite)((0, testUtils_1.db)())) {
                expect(1).toBe(1);
                return;
            }
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree3)(user1.id, '', '', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        { id: '00000000000000000000000000000001' },
                    ],
                },
            ]);
            const folder1 = yield (0, testUtils_1.models)().item().loadByName(user1.id, '000000000000000000000000000000F1.md');
            const note1 = yield (0, testUtils_1.models)().item().loadByName(user1.id, '00000000000000000000000000000001.md');
            yield (0, time_1.msleep)(1);
            expect(yield (0, testUtils_1.models)().item().dbContent(folder1.id)).not.toEqual(Buffer.from(''));
            expect(yield (0, testUtils_1.models)().item().dbContent(note1.id)).not.toEqual(Buffer.from(''));
            yield (0, testUtils_1.models)().item().deleteDatabaseContentColumn({ batchSize: 1 });
            const folder1_v2 = yield (0, testUtils_1.models)().item().loadByName(user1.id, '000000000000000000000000000000F1.md');
            const note1_v2 = yield (0, testUtils_1.models)().item().loadByName(user1.id, '00000000000000000000000000000001.md');
            expect(folder1.updated_time).toBe(folder1_v2.updated_time);
            expect(note1.updated_time).toBe(note1_v2.updated_time);
            expect(yield (0, testUtils_1.models)().item().dbContent(folder1.id)).toEqual(Buffer.from(''));
            expect(yield (0, testUtils_1.models)().item().dbContent(note1.id)).toEqual(Buffer.from(''));
        });
    });
    test('should delete the database item content - maxProcessedItems handling', function () {
        return __awaiter(this, void 0, void 0, function* () {
            if ((0, db_1.isSqlite)((0, testUtils_1.db)())) {
                expect(1).toBe(1);
                return;
            }
            const { user: user1 } = yield (0, testUtils_1.createUserAndSession)(1);
            yield (0, testUtils_1.createItemTree3)(user1.id, '', '', [
                {
                    id: '000000000000000000000000000000F1',
                    children: [
                        { id: '00000000000000000000000000000001' },
                        { id: '00000000000000000000000000000002' },
                        { id: '00000000000000000000000000000003' },
                        { id: '00000000000000000000000000000004' },
                    ],
                },
            ]);
            yield (0, testUtils_1.models)().item().deleteDatabaseContentColumn({ batchSize: 2, maxProcessedItems: 4 });
            const itemIds = (yield (0, testUtils_1.models)().item().all()).map(it => it.id);
            const contents = yield Promise.all([
                (0, testUtils_1.models)().item().dbContent(itemIds[0]),
                (0, testUtils_1.models)().item().dbContent(itemIds[1]),
                (0, testUtils_1.models)().item().dbContent(itemIds[2]),
                (0, testUtils_1.models)().item().dbContent(itemIds[3]),
                (0, testUtils_1.models)().item().dbContent(itemIds[4]),
            ]);
            const emptyOnes = contents.filter(c => c.toString() === '');
            expect(emptyOnes.length).toBe(4);
        });
    });
    // test('should stop importing item if it has been deleted', async function() {
    // 	const { user: user1 } = await createUserAndSession(1);
    // 	const tempDir1 = await tempDir('storage1');
    // 	const driver = await loadStorageDriver({
    // 		type: StorageDriverType.Filesystem,
    // 		path: tempDir1,
    // 	}, db());
    // 	let waitWrite = false;
    // 	const previousWrite = driver.write.bind(driver);
    // 	driver.write = async (itemId:string, content:Buffer, context: Context) => {
    // 		return new Promise((resolve) => {
    // 			const iid = setInterval(async () => {
    // 				if (waitWrite) return;
    // 				clearInterval(iid);
    // 				await previousWrite(itemId, content, context);
    // 				resolve(null);
    // 			}, 10);
    // 		});
    // 	}
    // 	await models().item().saveFromRawContent(user1, {
    // 		body: Buffer.from(JSON.stringify({ 'version': 1 })),
    // 		name: 'info.json',
    // 	});
    // 	const item = (await models().item().all())[0];
    // 	const promise = models().item().importContentToStorage(driver);
    // 	waitWrite = false;
    // 	await promise;
    // 	expect(await driver.exists(item.id, { models: models() })).toBe(true);
    // 	{
    // 		const result = await models().item().saveFromRawContent(user1, {
    // 			body: Buffer.from(JSON.stringify({ 'version': 2 })),
    // 			name: 'info2.json',
    // 		});
    // 		const item2 = result['info2.json'].item;
    // 		waitWrite = true;
    // 		const promise = models().item().importContentToStorage(driver);
    // 		await msleep(100);
    // 		await models().item().delete(item2.id);
    // 		waitWrite = false;
    // 		await promise;
    // 		expect(await driver.exists(item2.id, { models: models() })).toBe(false);
    // 	}
    // });
});
//# sourceMappingURL=ItemModel.test.js.map